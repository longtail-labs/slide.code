const http = require('http');

// --- Configuration ---
// Number of concurrent players to simulate
const NUM_PLAYERS = 50;
// Milliseconds between actions for each player.
// A lower number means more requests per second.
const ACTION_INTERVAL_MS = 2500;
// The base URL of your game server
const SERVER_URL = 'http://localhost:3000';
// Grid dimensions from types/game.go. Used for generating random coordinates.
const GRID_WIDTH = 40;
const GRID_HEIGHT = 25;
// ---------------------

// Use a single agent for all requests to reuse connections
const agent = new http.Agent({ keepAlive: true, maxSockets: NUM_PLAYERS + 5 });

/**
 * Creates a new player by making a request to the server to get a player_id cookie.
 * @returns {Promise<string>} A promise that resolves with the player's cookie string.
 */
function createPlayer() {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `${SERVER_URL}/`,
      { agent, method: 'GET' },
      (res) => {
        if (res.statusCode !== 200) {
          return reject(
            new Error(
              `Failed to create player, status code: ${res.statusCode}`,
            ),
          );
        }

        const cookies = res.headers['set-cookie'];
        if (cookies) {
          const playerCookie = cookies.find((c) => c.startsWith('player_id='));
          if (playerCookie) {
            const cookieValue = playerCookie.split(';')[0];
            resolve(cookieValue);
          } else {
            reject(
              new Error('player_id cookie not found in Set-Cookie header'),
            );
          }
        } else {
          reject(new Error('No Set-Cookie header received from server'));
        }
        res.resume(); // We don't need the body, so consume it.
      },
    );

    req.on('error', (e) => {
      reject(new Error(`Request to create player failed: ${e.message}`));
    });

    req.end();
  });
}

/**
 * Performs a "place bit" action for a given player.
 * @param {string} playerIdCookie - The cookie string for the player (e.g., 'player_id=some-id').
 */
function performAction(playerIdCookie) {
  const x = Math.floor(Math.random() * GRID_WIDTH);
  const y = Math.floor(Math.random() * GRID_HEIGHT);

  const url = `${SERVER_URL}/action?x=${x}&y=${y}`;
  const playerName = playerIdCookie.split('=')[1] || 'unknown';

  const req = http.request(
    url,
    {
      agent,
      method: 'POST',
      headers: { Cookie: playerIdCookie },
    },
    (res) => {
      // For stress testing, we are mostly concerned with the server handling the load.
      // We can log errors if we want to see them.
      if (res.statusCode < 200 || res.statusCode >= 300) {
        let errorBody = '';
        res.on('data', (chunk) => (errorBody += chunk));
        res.on('end', () => {
          console.error(
            `[${playerName}] Action failed: Status ${res.statusCode} - ${errorBody}`,
          );
        });
      }
      res.resume(); // consume response data
    },
  );

  req.on('error', (e) => {
    console.error(`[${playerName}] Error performing action:`, e.message);
  });

  req.end();
}

/**
 * Main function to set up and run the stress test.
 */
async function main() {
  console.log(`🚀 Starting stress test with ${NUM_PLAYERS} players.`);
  console.log(
    `⚡️ Each player will attempt an action every ~${ACTION_INTERVAL_MS}ms.`,
  );
  console.log(`🎯 Target server: ${SERVER_URL}`);

  const playerCookies = [];
  for (let i = 0; i < NUM_PLAYERS; i++) {
    try {
      // Stagger player creation to avoid a thundering herd on the server at startup
      await new Promise((resolve) => setTimeout(resolve, 50));
      const cookie = await createPlayer();
      playerCookies.push(cookie);
      console.log(
        `[${i + 1}/${NUM_PLAYERS}] Player created: ${cookie.split('=')[1]}`,
      );
    } catch (error) {
      console.error(`❌ Failed to create player ${i + 1}:`, error.message);
    }
  }

  if (playerCookies.length === 0) {
    console.error('No players were created. Aborting stress test.');
    return;
  }

  console.log(
    `\n🎉 All ${playerCookies.length} players created. Starting action simulation...`,
  );

  playerCookies.forEach((cookie, index) => {
    // Add a random initial delay to each player's action loop to further spread out requests.
    const startDelay = Math.random() * ACTION_INTERVAL_MS;

    setTimeout(() => {
      const playerName = cookie.split('=')[1] || index + 1;
      console.log(`▶️ Starting actions for player ${playerName}`);

      setInterval(() => {
        performAction(cookie);
      }, ACTION_INTERVAL_MS);
    }, startDelay);
  });
}

main().catch(console.error);

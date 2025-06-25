const { Collection } = require("@signaldb/core");
const maverickjsReactivityAdapter = require("@signaldb/maverickjs");
const createFileSystemAdapter = require("./createFilesystemAdapter");

const messages = new Collection({
	persistence: createFileSystemAdapter("messages.json"),
	reactivity: maverickjsReactivityAdapter,
});

module.exports = { messages };

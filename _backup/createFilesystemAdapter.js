const { createPersistenceAdapter } = require("@signaldb/core");
const fs = require("fs");

function createFilesystemAdapter(filename, options) {
	const { serialize = JSON.stringify, deserialize = JSON.parse } =
		options || {};

	let savePromise = null;

	async function getItems() {
		try {
			await fs.promises.access(filename);
		} catch (error) {
			return [];
		}
		const serializedItems = await fs.promises
			.readFile(filename, "utf8")
			.catch((error) => {
				if (error.code === "ENOENT") return null;
				throw error;
			});
		return serializedItems ? deserialize(serializedItems) : [];
	}

	return createPersistenceAdapter({
		async register(onChange) {
			try {
				await fs.promises.access(filename);
			} catch (error) {
				await fs.promises.writeFile(filename, "[]", "utf8");
			}
			fs.watch(filename, { encoding: "utf8" }, () => {
				onChange();
			});
		},
		async load() {
			if (savePromise) await savePromise;
			const items = await getItems();
			return { items };
		},
		async save(_items, { added, modified, removed }) {
			if (savePromise) await savePromise;
			savePromise = getItems()
				.then((currentItems) => {
					const items = [...currentItems];
					added.forEach((item) => {
						const index = items.findIndex(({ id }) => id === item.id);
						if (index !== -1) {
							items[index] = item;
							return;
						}
						items.push(item);
					});
					modified.forEach((item) => {
						const index = items.findIndex(({ id }) => id === item.id);
						if (index === -1) {
							items.push(item);
							return;
						}
						items[index] = item;
					});
					removed.forEach((item) => {
						const index = items.findIndex(({ id }) => id === item.id);
						if (index === -1) return;
						items.splice(index, 1);
					});
					return items;
				})
				.then(async (items) => {
					await fs.promises.writeFile(filename, serialize(items), "utf8");
				})
				.then(() => {
					savePromise = null;
				});
			await savePromise;
		},
	});
}

module.exports = createFilesystemAdapter;

const keystone = require('@keystone-alpha/core');

const { port } = require('./config');

const initialData = require('./data');

keystone
  .prepare({ port })
  .then(async ({ server, keystone: keystoneApp }) => {
    await keystoneApp.connect();

    // Initialise some data.
    // NOTE: This is only for test purposes and should not be used in production
    const users = await keystoneApp.lists.User.adapter.findAll();
    if (!users.length) {
      Object.values(keystoneApp.adapters).forEach(async adapter => {
        await adapter.dropDatabase();
      });
      await Promise.all(
        Object.entries(initialData).map(async ([listName, items]) => {
          const list = keystoneApp.lists[listName];
          await keystoneApp.executeQuery({
            query: `mutation ($items: [${list.gqlNames.createManyInputName}]) { ${
              list.gqlNames.createManyMutationName
            }(data: $items) { id } }`,
            schemaName: 'admin',
            variables: { items: items.map(d => ({ data: d })) },
          });
        })
      );
    }

    server.app.get('/reset-db', async (req, res) => {
      Object.values(keystoneApp.adapters).forEach(async adapter => {
        await adapter.dropDatabase();
      });
      await Promise.all(
        Object.entries(initialData).map(async ([listName, items]) => {
          const list = keystoneApp.lists[listName];
          await keystoneApp.executeQuery({
            query: `mutation ($items: [${list.gqlNames.createManyInputName}]) { ${
              list.gqlNames.createManyMutationName
            }(data: $items) { id } }`,
            schemaName: 'admin',
            variables: { items: items.map(d => ({ data: d })) },
          });
        })
      );
      res.redirect('/admin');
    });
    await server.start();
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

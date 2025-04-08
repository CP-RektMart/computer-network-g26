# Chat Server

### Install dependency
````
npm install
````

### Docker 
````
docker-compose up
````

### ENV
**PORT**: The port on which the server will run.<br />
**JWT_SECRET**: The jwt secret.<br />
**LOG_REQUESTS**: Set this to **FULL** for detailed logs, **SMALL** for minimal logs, or leave it **empty** for no logging.<br />
**DATABASE_URL**: The URL to your database.<br />

### Migrate Database
If you make any changes to the database schema, you'll need to run the migration scripts.
````
npm run migrate
````
If you want to deploy the latest database schema changes, use:
````
npm run generate
npm run migrate:deploy
````

### Run
````
npm run dev
````
Default it will also run generate and migrate:deploy for lately

### Example group/direct Chat 
Run **example.sql** in pgadmin
Open file **example.html** for play with group / direct messages socket.io

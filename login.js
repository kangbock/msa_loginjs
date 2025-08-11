var mysql = require('mysql');
var fs = require('fs');
const express = require('express');
const app = express();
const client = require('prom-client');
const port = process.env.PORT || 3000;
//var session = require('express-session'); // crash looping test
var fileStore = require('session-file-store')(session);
const serverCa = [fs.readFileSync("/var/task/DigiCertGlobalRootCA.crt.pem", "utf8")];

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static('static'));
app.use(session({
    secret: 'kang',
    resave: false,
    saveUninitialized: true,
    store: new fileStore()
}));

const config = {
    host: "prod-kb97-mysql.mysql.database.azure.com",
    user: "admin1",
    password: "It12345!",
    port: 3306,
    database: 'project', // Include the database here
    ssl: {
        rejectUnauthorized: true,
        ca: serverCa
    }
};

var pool = mysql.createPool(config);

// Verify connection at startup
pool.getConnection(function (err, connection) {
    if (err) {
        console.error('Error connecting to the database:', err);
        process.exit(1); // Exit the application
    } else {
        console.log('Connected to the database.');
        connection.release();
    }
});

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics to the registry
client.collectDefaultMetrics({ register });

// Expose the /metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

app.listen(9113, () => {
    console.log('Metrics server listening on port 9113');
});

// login controller
app.post('/login.js', function (req, res) {
    const data = { id: req.body.id, password: req.body.password };
    console.log('post id : ' + data.id);

    pool.getConnection(function (err, connection) {
        if (err) {
            console.error('Error getting connection from pool:', err);
            return res.status(500).send('Database connection error');
        }

        connection.query('SELECT * FROM member WHERE email = ?', [data.id], function (err, rows) {
            connection.release();

            if (err) {
                console.error('Error querying the database:', err);
                return res.status(500).send('Error querying the database');
            }

            if (!rows || rows.length === 0) {
                return res.send('No matching ID found');
            }

            const user = rows[0];
            // TODO: bcrypt.compare(data.password, user.password)
            if (user.email === data.id && user.password === data.password) {
                req.session.logined = true;
                req.session.user_id = data.id;
                return res.redirect(303, '/main.html'); // 핵심 수정
            }

            return res.send("<script>alert('아이디 또는 비밀번호가 일치하지 않습니다.'); location.href='/login.html';</script>");
        });
    });
});


app.get('/health.html', function (req, res) {
    res.sendStatus(200);
});

var server = app.listen(port, function () {
    console.log("Express server has started on port : " + port);
});


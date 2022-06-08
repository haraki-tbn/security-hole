const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const session = require('express-session');
const port = process.env.PORT || 3000
const { Pool } = require('pg');
const pgConnectionString = process.env.DATABASE_URL || "postgresql://postgres:@localhost:5432/security_hole_db";
let pool = null;
if (process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
}
else {
    pool = new Pool({
        connectionString: "postgresql://postgres:@localhost:5432/security_hole_db"
    });
}

app.set('view engine', 'pug');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret : 'example-secret', 
    resave : false,               
    saveUninitialized : true,                
    rolling : true,
    name : 'security-hole-sample-cookie',
    cookie : {
        maxAge : 1000 * 60 * 60 // 1時間
    }
}));

var sessionCheck = function(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('login');
    }
};

app.get('/login', function (req, res) {
    if (req.session.user) {
        delete req.session.user;
    }
    res.render('login', { title: 'Login' });
});

app.post('/login', function (req, res) {
    const query = {
        text: 'select id, name from users where email = $1 and password = $2',
        values: [req.body.email, req.body.password]
    };
    pool.query(query, function (error, results) {
        if (error) throw error;
        if (results.length === 0) {
            res.render('login', { title: 'Login', errorMsg: 'Emailまたは、Passwordが間違っています' });
        }
        else {
            req.session.user = {name: results.rows[0].name, id: results.rows[0].id}
            res.redirect('/menu?userid=' + results.rows[0].id);
        }
    });
});

app.get('/menu', sessionCheck, function (req, res) {
    const query = {
        text: 'select name, role_id from users where id = $1',
        values: [req.query.userid]
    };
    pool.query(query, function (error, results) {
        if (error) throw error;
        if (results.length === 0) {
            delete req.session.user;
            res.render('login', { title: 'Login', errorMsg: '不正なパラメータです' });
        }
        else {
            res.render('menu', { title: 'メニュー', userName: results.rows[0].name, roleId: results.rows[0].role_id, userId: req.query.userid});
        }
    });
});

app.get('/info', sessionCheck, function (req, res) {
    if (req.session.user.id != req.query.userid) {
        delete req.session.user;
        res.render('login', { title: 'Login', errorMsg: '不正なパラメータです' });
    }
    else {
        const query = {
            text: 'SELECT ' +
                  '  u1.id as id ' +
                  '  ,u1.name as name ' +
                  '  ,u2.id as boss_id ' +
                  '  ,u2.name as boss_name ' +
                  'FROM ' +
                  '  users u1 ' +
                  'LEFT JOIN ' +
                  '  users u2 ' +
                  'ON ' +
                  '  u1.boss_id = u2.id ' +
                  'WHERE ' +
                  '  u1.id = $1',
            values: [req.query.userid]
        };
        pool.query(query, function (error, results) {
            if (error) throw error;
            if (results.length === 0) {
                delete req.session.user;
                res.render('login', { title: 'Login', errorMsg: '不正なパラメータです' });
            }
            else {
                res.render('info', { title: 'あなたの情報', userId: results.rows[0].id, userName: results.rows[0].name, bossId: results.rows[0].boss_id, bossName: results.rows[0].boss_name});
            }
        });
    }
});

app.get('/customer/info', sessionCheck, function (req, res) {
    if (req.session.user.id != req.query.userid) {
        delete req.session.user;
        res.render('login', { title: 'Login', errorMsg: '不正なパラメータです' });
    }
    else {
        const query = {
            text: 'SELECT ' +
                  '  c.id as id ' +
                  '  ,c.name as name ' +
                  '  ,c.address as address ' +
                  'FROM ' +
                  '  user_customers uc, ' +
                  '  customers c ' +
                  'WHERE ' +
                  '  uc.user_id = $1 ' + 
                  '  AND uc.customer_id = c.id',
            values: [req.query.userid]
        };
        pool.query(query, function (error, results) {
            if (error) throw error;
            res.render('list', { title: '顧客情報', list: results.rows, userId: req.query.userid});
        });
    }
});

app.get('/customer/all/info', sessionCheck, function (req, res) {
    const query = {
        text: 'SELECT ' +
              '  c.id as id ' +
              '  ,c.name as name ' +
              '  ,c.address as address ' +
              'FROM ' +
              '  user_customers uc, ' +
              '  customers c ' +
              'WHERE ' +
              '  uc.customer_id = c.id'
    };
    pool.query(query, function (error, results) {
        if (error) throw error;
        res.render('list', { title: '顧客情報', list: results.rows, userId: req.session.user.id});
    });
});

app.listen(port, function () {
    console.log('Example app listening on port 3000!');
});

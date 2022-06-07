var express = require('express');
var app = express();
var mysql = require('mysql');
var bodyParser = require('body-parser');
var session = require('express-session');
var pool = mysql.createPool({
    connectionLimit : 10,
    user: 'root',
    password: 'bs2g',
    database: 'security_hole_db',
    host: 'dbserver'
});

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
    pool.query('SELECT id, name from users where email = ? and password = ?;', [req.body.email, req.body.password], function (error, results, fields) {
        if (error) throw error;
        if (results.length === 0) {
            res.render('login', { title: 'Login', errorMsg: 'Emailまたは、Passwordが間違っています' });
        }
        else {
            req.session.user = {name: results[0].name, id: results[0].id}
            res.redirect('/app/menu?userid=' + results[0].id);
        }
    });
});

app.get('/menu', sessionCheck, function (req, res) {
    pool.query('SELECT name, role_id from users where id = ?;', [req.query.userid], function (error, results, fields) {
        if (error) throw error;
        if (results.length === 0) {
            delete req.session.user;
            res.render('login', { title: 'Login', errorMsg: '不正なパラメータです' });
        }
        else {
            res.render('menu', { title: 'メニュー', userName: results[0].name, roleId: results[0].role_id, userId: req.query.userid});
        }
    });
});

app.get('/info', sessionCheck, function (req, res) {
    if (req.session.user.id != req.query.userid) {
        delete req.session.user;
        res.render('login', { title: 'Login', errorMsg: '不正なパラメータです' });
    }
    else {
        pool.query(
            'SELECT ' +
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
            '  u1.id = ?;', [req.query.userid], function (error, results, fields) {
            if (error) throw error;
            if (results.length === 0) {
                delete req.session.user;
                res.render('login', { title: 'Login', errorMsg: '不正なパラメータです' });
            }
            else {
                res.render('info', { title: 'あなたの情報', userId: results[0].id, userName: results[0].name, bossId: results[0].boss_id, bossName: results[0].boss_name});
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
        pool.query(
            'SELECT ' +
            '  c.id as id ' +
            '  ,c.name as name ' +
            '  ,c.address as address ' +
            'FROM ' +
            '  user_customers uc, ' +
            '  customers c ' +
            'WHERE ' +
            '  uc.user_id = ? ' + 
            '  AND uc.customer_id = c.id;', [req.query.userid], function (error, results, fields) {
            if (error) throw error;
            res.render('list', { title: '顧客情報', list: results, userId: req.query.userid});
        });
    }
});

app.get('/customer/all/info', sessionCheck, function (req, res) {
    pool.query(
        'SELECT ' +
        '  c.id as id ' +
        '  ,c.name as name ' +
        '  ,c.address as address ' +
        'FROM ' +
        '  user_customers uc, ' +
        '  customers c ' +
        'WHERE ' +
        '  uc.customer_id = c.id;', function (error, results, fields) {
        if (error) throw error;
        res.render('list', { title: '顧客情報', list: results, userId: req.session.user.id});
    });
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
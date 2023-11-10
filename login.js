var mysql = require('mysql');
var fs = require('fs');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
var session= require('express-session');
var fileStore= require('session-file-store')(session);
const serverCa = [fs.readFileSync("/var/task/DigiCertGlobalRootCA.crt.pem", "utf8")];

app.use(express.urlencoded({extended : true}));
app.use(express.json());

app.use(express.static('static')); 
app.use(session({
    secret: 'kang',
    resave: false,
    saveUninitialized: true,
    store: new fileStore()
}));


var main_board = "SELECT * FROM member, board WHERE member.id = board.member_id ORDER BY board.board_id;";
var board_write = "";

const config = {
    host    : "prod-kb97-mysql.mysql.database.azure.com",
    user    : "admin1",
    password: "It12345!",
    port    : 3306,
    ssl: {
        rejectUnauthorized: true,
        ca: serverCa
    }
}
var connection = mysql.createConnection(config);

connection.connect(function(err) {
        if (err) {
                console.error("Database connection failed : " + err.stack);
                return;
        }

        console.log('Connected to database.');
});

connection.changeUser({
    database : 'project'
}, (err) => {
    if (err) {
      console.log('Error in changing database', err);
      return;
    }
    // Do another query
});

app.set('view engine', 'ejs');

// login controller
app.post('/login.js',function(req,res){
        // <form> 에서 보낸 값을 받아온다 POST
    var data={
        'id' : req.body.id,
        'password' : req.body.password   
    }
    console.log('post id : '+data.id);
    console.log('post password : '+data.password);
        //res.send(data.id+" "+data.password)

        // DB로 query해서 레코드가 있는지 확인한다
    connection.query('select * from member where email="'+data.id+'";', function(err,rows,fields){
        console.log('queried');
        if (err) { 
            //1. 쿼리에 실패하면 -> 에러페이지
            res.status=302;
            res.send('Error : '+err)
            res.end();
        }else if(rows.length<=0){
           //2. 레코드가 없으면 -> 로그인 실패 페이지
            res.send('no id match found');
            res.end();
        }else   
        {   //3. 레코드가 있으면 ->
                // 비밀번호와 아이디 확인
		console.log(rows[0]['password']);
            if( rows[0]['email']==data.id && rows[0]['password']==data.password)
            {   //같으면 로그인 성공 페이지== 로그인 세션을 가진 메인페이지
            
                req.session.logined= true;
                req.session.user_id=req.body.id;
                res.render('https://www.k-tech.cloud/main.html',{data});
            }
                // 다르면 로그인 실패, 에러를 출력하고 다시 로그인 페이지로
            else
            {
                res.send("<script>alert('아이디 또는 비밀번호가 일치하지 않습니다.'); location.href='https://www.k-tech.cloud/login.html';</script>") 
            }
        }
    }); return (0);
        
});

app.get('/health.html',function(req,res,err){
	res.sendStatus(200);
});

var server = app.listen(port, function () {
    console.log("Express server has started on port : " + port);
});


app.engine('html',require('ejs').renderFile);
const mysql = require('mysql');
const creds = require('./creds.json');

console.log('Connecting to mysql');
let con = mysql.createConnection({
    host: "localhost",
    user: creds.db.username,
    password: creds.db.password
});
    
con.connect(err => {
    if (err) throw err;
    console.log("Connected!");

    let sql = `SELECT content from moneyrates.page_content where id = 1`;
    con.query(sql, (err, result) => {
        if (err) throw err;
        console.log(result);
        if (!result) {
            
        }
    });

    con.end();
});

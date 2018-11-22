//https://medium.com/@e_mad_ehsan/getting-started-with-puppeteer-and-chrome-headless-for-web-scrapping-6bf5979dee3e
//https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md
//https://codeburst.io/a-guide-to-automating-scraping-the-web-with-javascript-chrome-puppeteer-node-js-b18efb9e9921
//https://github.com/checkly/puppeteer-examples#2-search
//https://www.aymen-loukil.com/en/blog-en/google-puppeteer-tutorial-with-examples/
//https://browsee.io/blog/puppeteer-how-to-find-a-link-element-with-a-certain-text/
//https://stackoverflow.com/questions/47821995/how-to-click-on-a-link-that-has-a-certain-content-in-puppeteer

//issues:
//PDFs
//zip codes

const puppeteer = require('puppeteer');
const mysql = require('mysql');
const cheerio = require('cheerio');
const loginPage = 'https://hqfinance.quinstreet.com/qsauthentication/login/';
const toolPage  = 'https://hqfinance.quinstreet.com/tools/deposits-rate-tool';
const creds     = require('./creds.json');

//dom element selectors
const usernameSelector = '#login_form input[name="username"]';
const passwordSelector = '#password';
const buttonSelector   = '#login_button'; 
const rateTableRows    = '#rate-table > tbody > tr';
const bank1stCharStart = 'P'; 
const banklastCharStart  = 'V';
const pauseExeptions = [
    'American Express National Bank', 
    'BBVA Compass (Rate in CA)', 
    'TTIA Direct'
];

async function run() {
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 250 // slow down by 250ms
    });
    //login
    const toolTab = await browser.newPage();
    await toolTab.setViewport({ width: 1566, height: 768});
    await toolTab.goto(loginPage); 
    await toolTab.waitFor(3000);

    console.log('Logging in');
    await toolTab.click(usernameSelector);
    await toolTab.keyboard.type(creds.tool.username);

    await toolTab.click(passwordSelector);
    await toolTab.keyboard.type(creds.tool.password);

    await toolTab.click(buttonSelector);

    await toolTab.waitForNavigation(); 

    console.log('Logged in!  Going to Tool page');
    await toolTab.goto(toolPage);
    await toolTab.waitFor(3000);

    console.log('Loading Tool page HTML');
    let content = await toolTab.content();
    let $ = cheerio.load(content);

    console.log('Connecting to mysql');
    const con = mysql.createConnection({
        host: "localhost",
        user: creds.db.username,
        password: creds.db.password
    });
      
    con.connect(err => {
        if (err) throw err;
        console.log("Connected! Opening new tab");
        const bankTab = await browser.newPage();

        $(rateTableRows).each((i, tr) => {
            let $tr = $(tr);
            let bankName = $tr.find('td.merch-name').text();
            let bank1stChar = bankName.charAt(0).toUpperCase();
            let updateFrequency = $tr.find('td.update_frequency_txt').text();
            
            if(  bank1stChar >= bank1stCharStart && bank1stChar <= banklastCharStart
              && (updateFrequency.toLowerCase !== 'paused' || pauseExeptions.includes(bankName))) {
                console.log(`Checking ${bankName} for changes`);
                let rowId = $tr.attr('id');
                let bankUrl = $tr.find('td.merch-link').text();
                await bankTab.goto(bankUrl); 
                await bankTab.waitFor(2000);
                let sql = `SELECT content from moneyrates.page_content where id = ${rowId}`;
                con.query(sql, function (err, result) {
                    if (err) throw err;
                    if (!result) {
                        
                    }
                    else {

                    }
                });
            }
        });
    });

    con.end();

    //setTimeout(async () => {
        await browser.close();
    //}, 60000 * 4);
}
run();
//https://medium.com/@e_mad_ehsan/getting-started-with-puppeteer-and-chrome-headless-for-web-scrapping-6bf5979dee3e
//https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md
//https://codeburst.io/a-guide-to-automating-scraping-the-web-with-javascript-chrome-puppeteer-node-js-b18efb9e9921
//https://github.com/checkly/puppeteer-examples#2-search
//https://www.aymen-loukil.com/en/blog-en/google-puppeteer-tutorial-with-examples/
//https://browsee.io/blog/puppeteer-how-to-find-a-link-element-with-a-certain-text/
//https://stackoverflow.com/questions/47821995/how-to-click-on-a-link-that-has-a-certain-content-in-puppeteer

//node inspect index.js to debug
//http://toddhayton.com/2018/08/01/scraping-with-puppeteer/

const puppeteer = require('puppeteer');
const loginPage = 'https://hqfinance.quinstreet.com/qsauthentication/login/';
const toolPage  = 'https://hqfinance.quinstreet.com/tools/deposits-rate-tool';
const creds     = require('./creds');

//dom element selectors
const usernameSelector = '#login_form input[name="username"]';
const passwordSelector = '#password';
const buttonSelector   = '#login_button'; 
const rateTableBody    = '#rate-table > tbody';

async function run() {
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 250 // slow down by 250ms
    });
    //login
    const toolTab = await browser.goto(loginPage); // await browser.newPage();
    await toolTab.setViewport({ width: 1366, height: 768});

    //await toolTab.goto(loginPage);

    await toolTab.click(usernameSelector);
    await toolTab.keyboard.type(creds.username);

    await toolTab.click(passwordSelector);
    await toolTab.keyboard.type(creds.password);

    await toolTab.click(buttonSelector);

    await toolTab.waitForNavigation(); 

    await toolTab.goto(toolPage);
    await toolTab.waitFor(3000);

    const rows = await toolTab.evaluate(() => {
        //const rows = Array.from(document.querySelectorAll('#rate-table tbody tr'));
        //return rows.map(row => row.innerHTML);
        return document.querySelectorAll('#rate-table tbody tr');
    });
    for (var row of rows) { 
        debugger;
        let editLink = row.querySelector('td.action a:first-child');
        let bankLink = row.querySelector('td.merch-link span');

        //open bank pages in new tab
        const banksTab = await browser.goto(bankLink);
        await banksTab.setViewport({ width: 1366, height: 768});
        //find in page
        //const found = (await banksTab.content()).match(REGEX)
    }

    setTimeout(async () => {
        await browser.close();
    }, 60000 * 4);
}
run();
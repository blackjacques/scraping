const puppeteer = require('puppeteer');
const toolPage = 'file:///C:/Users/Rob/Training/scraping/tests/HQ%20Finance%20Deposits(CPS)%20__%20Tools.html';

async function run() {
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 250, // slow down by 250ms
        timeout: 0
    });
    //login
    const toolTab = await browser.newPage();
    await toolTab.setViewport({ width: 1566, height: 768});
    await toolTab.goto(toolPage); // await browser.newPage();
    
    //await toolTab.goto(loginPage);

    //await toolTab.waitForNavigation(); 
    await toolTab.waitFor(3000);
    
    //sore by bank name
    await toolTab.click('#rate-table > thead > tr.table_header > th.merch-name.header');
    await toolTab.waitFor(3000);

    //get first bank
    const rows = await toolTab.$$eval( '#rate-table tbody tr', trs => {
        return trs.map( tr => {
            return tr.querySelector( 'td:nth-child(1) a' ).href;
        } ).filter( href => /^file.*idx$/.test( href ) );
    } );
    
    for (var row of rows) { 
        //console.log(row);
    }

    //browser.close();
    //const firstBankRow  = document.querySelector('#6067');
    //const fisrtBankLink = firstBankRow.querySelector('#6067-ad_link > span').innerHTML;
    //const bankTab       = await browser.newPage();
    //await bankTab.goto(fisrtBankLink);

}
run().catch(err => {
    console.log('Error! ' + err);
});
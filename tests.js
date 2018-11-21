const puppeteer = require('puppeteer');
const toolPage  = 'file:///C:/Users/Rob/Training/scraping/tests/HQ%20Finance%20Deposits(CPS)%20__%20Tools.html';
const bank1stCharStart = 'P'; 
const banklastCharStart  = 'V';
const pauseExeptions = ['American Express National Bank', 'BBVA Compass (Rate in CA)', 'TTIA Direct'];

function isSorted(arr) {
    return arr.every(function (x, i) {
        return i === 0 || x >= arr[i - 1];
    });
}

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
    
    //console.log('Sorting banks by name');
    //sort by bank name
    //await toolTab.click('#rate-table > thead > tr.table_header > th.merch-name.header');
    //await toolTab.waitFor(10000);

    console.log('Fetching relevant banks');
    //get relevant bank
    const banks = await toolTab.$$eval('#rate-table tbody tr', (trs, bank1stCharStart, banklastCharStart) => {
        return trs.filter( tr => {
            var bankName = tr.querySelector('td.merch-name').textContent;
            var updateFrequency = tr.querySelector('td.update_frequency_txt').textContent;
            var bank1stChar = bankName.charAt(0).toUpperCase();
            return bank1stChar >= bank1stCharStart && bank1stChar <= banklastCharStart
                   && (updateFrequency.toLowerCase !== 'paused' || pauseExeptions.includes(bankName));
        }).map(banks => banks.outerHTML);
    }, bank1stCharStart, banklastCharStart, pauseExeptions);
    
    //console.log(banks);
    console.log(`Got ${banks.length} banks.`);

    for (var bank of banks) { 
        //var bankName = bank.querySelector('td.merch-name').textContent;
        //console.log(`Processing ${bankName}.`);
        //console.log(bank);
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
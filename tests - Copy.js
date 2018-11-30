const puppeteer = require('puppeteer');
const path = require('path');
const toolPage  = 'file:///I:/My Documents/articles/MoneyRates/scraping/tests/HQ%20Finance%20Deposits(CPS)%20__%20Tools.html';
const bank1stCharStart = 'P'; 
const banklastCharStart  = 'V';
const pauseExeptions = [
    'American Express National Bank', 
    'BBVA Compass (Rate in CA)', 
    'TTIA Direct'
];
const nameHeaderSelector = '#rate-table > thead > tr.table_header > th.merch-name.header';

function isSorted(arr) {
    return arr.every(function (x, i) {
        return i === 0 || x >= arr[i - 1];
    });
}

async function run() {

    const browser = await puppeteer.launch({
        headless: false,
       // slowMo: 250, // slow down by 250ms
        timeout: 0
    });
    //login
    const toolTab = await browser.newPage();
    await toolTab.setViewport({ width: 1566, height: 768});
    await toolTab.goto(toolPage); // await browser.newPage();
    
    function getRemainingBanks(banks, bankName, processedIds) {
        let bankRows = [], i = 0;
        do {
            if (!processedIds.includes(banks[i].id)) bankRows.push(banks[i])
        } while (bankName == banks[++i].name);
        return bankRows;
    } 
    
    async function changeRowColor(rowId, url, bgColor) {
        return await toolTab.evaluate((id, url, bgColor) => { 
            let arr  = [], 
                rows = $(`tr#${id}`).siblings(`:contains("${url}")`).andSelf();
    
            rows.children('td').css('background-color', bgColor);
    
            rows.each((i, row) => arr.push(row.id));
            return arr;
        }, rowId, url, bgColor);
    }

    //await toolTab.goto(loginPage);

    //await toolTab.waitForNavigation(); 
    await toolTab.waitFor(2000);
    
    console.log('Going to Tool page');
    await toolTab.goto(toolPage);
    await toolTab.waitFor(2000);

    console.log('Sorting Banks');
    await toolTab.click(nameHeaderSelector);
    await toolTab.waitFor(3000);

    //one more time
    await toolTab.click(nameHeaderSelector);
    await toolTab.waitFor(3000);

    console.log('Fetching relevant banks');
    //get relevant bank
    let banks = await toolTab.$$eval('#rate-table tbody tr', (trs, bank1stCharStart, banklastCharStart, pauseExeptions) => {
        return trs.filter( tr => {
            let bankName = tr.querySelector('td.merch-name').textContent;
            let updateFrequency = tr.querySelector('td.update_frequency_txt').textContent;
            let bank1stChar = bankName.charAt(0).toUpperCase();
            
            if ( bank1stChar >= bank1stCharStart && bank1stChar <= banklastCharStart
               && (updateFrequency.toLowerCase !== 'paused' || pauseExeptions.includes(bankName)) ) {
                return true;
            }
            else {
                $(tr).remove();
            }
        }).map(bank => {
            return {
                id:   bank.id,
                name: bank.querySelector('td.merch-name').textContent,
                url:  bank.querySelector('td.merch-link').textContent,
                note: bank.querySelector('td.note').textContent
            }
        });
    }, bank1stCharStart, banklastCharStart, pauseExeptions);
    
    //console.log(banks);
    console.log(`Got ${banks.length} banks.`);

    const firstRowId = banks[0].id;
    //for (var bank of banks) { 
    while (banks.length) {
        let color = '';
        let bank = banks[0];
        if (path.extname(bank.url) === '.pdf') {
            console.log('pdf');
            
        }
        else if (bank.note.includes('Rate collected within')) {
            console.log('zipcode');

        } else {
            console.log('check for changes');
            color = '#AED6F1';
        }
        let processedIds = await changeRowColor(bank.id, bank.url, color);
        let bankRows = processedIds.length > 1
                        ? getRemainingBanks(banks, bank.name, processedIds)
                        : [];
        banks = bankRows.concat(banks.slice(processedIds.length));
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
const data = {
    "file:///C:/Users/Rob/Training/scraping/tests/data/no_match.html": {
        "selector": '#content',
        "content": `This won't match!`
    },
    "file:///C:/Users/Rob/Training/scraping/tests/data/no_match.html": {
        "selector": '#content',
        "content": `This won't match!`
    },
    "file:///C:/Users/Rob/Training/scraping/tests/data/match.html": {
        "selector": '#content',
        "content": `This will match!`
    }
};

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
//const mysql     = require('mysql');
//const cheerio   = require('cheerio');
const toolPage  = 'file:///C:/Users/Rob/Training/scraping/tests/HQ%20Finance%20Deposits(CPS)%20__%20Tools.html';
//const creds     = require('./creds.json');
const path = require('path');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;
//dom element selectors
const usernameSelector = '#login_form input[name="username"]';
const passwordSelector = '#password';
const buttonSelector   = '#login_button'; 
const nameHeaderSelector = '#rate-table > thead > tr.table_header > th.merch-name.header';
const rateTableRows    = '#rate-table > tbody > tr';
const bank1stCharStart = 'P'; 
const banklastCharStart  = 'V';
const pauseExeptions = [
    'American Express National Bank', 
    'BBVA Compass (Rate in CA)', 
    'TTIA Direct'
];
let rowsMoved   = 0;
let rowColor    = '';
let missingUrls = 0;

async function run() {
    const logger = createLogger({
        transports: [
          new transports.Console(),
          new transports.File({ filename: 'deposit_rates.log' })
        ],
        format: format.splat()
    });

    logger.log('info', 'Process started.');
    const browser = await puppeteer.launch({
        headless: false //,
        //slowMo: 250 // slow down by 250ms
    });

    const toolTab = await browser.newPage();
    await toolTab.setViewport({ width: 1566, height: 768});

    logger.info('Going to Tool page');
    await toolTab.goto(toolPage);
    await toolTab.waitFor(2000);

    logger.info('Sorting Banks');

    await toolTab.click(nameHeaderSelector);
    await toolTab.waitFor(3000);

    //one more time
    await toolTab.click(nameHeaderSelector);
    await toolTab.waitFor(3000);

    //let content = await toolTab.content();
    //let $ = cheerio.load(content);

    /*
    logger.log('Connecting to mysql');
    const con = mysql.createConnection({
        host: "localhost",
        user: creds.db.username,
        password: creds.db.password
    });

    async function moveRow(rowId, firstRowId, bgColor) {
        await toolTab.evaluate((id, firstRowId, bgColor) => { 
            $('#'+id).insertBefore($('tr#'+firstRowId)).children('td').css('background-color', bgColor);
        }, rowId, firstRowId, bgColor);
    }

    async function moveRows(rowId, url, firstRowId, bgColor) {
        return await toolTab.evaluate((id, url, firstRowId, bgColor) => { 
            let rows = $(`tr#${id}`).siblings(`:contains("${url}")`).andSelf();

            rows.insertBefore($(`tr#${firstRowId}`))
                .children('td')
                .css('background-color', bgColor);

            return rows.length;
        }, rowId, url, firstRowId, bgColor);
    }

    async function resaveBankInfo(rowId) {
        let processedIds  = [], i = 0;

        do {
            //let linkSelector = `#${rowId}-controls > a:first-of-type`;
            await toolTab.$x(`//*[@id="${rowId}-controls"]/a[text()="Edit"]`).then(async elts => {
                console.log(`Clicking edit link.`);
                let editLink = elts[0];
                await editLink.click();
                await editLink.dispose();

                //await toolTab.waitFor(3000);
                await toolTab.waitForXPath(`//*[@id="${rowId}-controls"]/a[text()="Save"]`).then(async saveLink => {
                    console.log(`Clicking save link.`);
                    await saveLink.click();
                    await saveLink.dispose();
                    await toolTab.waitForXPath(`//*[@id="${rowId}-controls"]/a[text()="Edit"]`).then(async editLink => {
                        await editLink.dispose();
                        await toolTab.evaluate((id) => { 
                            $('tr#'+id).remove();
                        }, rowId); //, linkSelector);
                    });
                });
            });
        } while (bankName == banks[++i].name);

        return processedIds;
    }
    */

   function getBankRows(banks, bankName) {
        let bankRows = [], i = 0;
        do {
            bankRows.push(banks[i])
        } while (bankName == banks[++i].name);
    } 

    function getRemainingBanks(banks, bankName, processedIds) {
        let bankRows = [], i = 0;
        do {
            if (!processedIds.includes(banks[i].id)) bankRows.push(banks[i])
        } while (bankName == banks[++i].name);
        return bankRows;
    } 
    
    async function changeRowColor(rowId, url, bgColor) {
        return await toolTab.evaluate((id, url, bgColor) => { 
            let processedIds = [], 
                rows         = $(`tr:contains("${url}")`);
                //$(`tr#${id}`).siblings(`:contains("${url}")`).andSelf();
    
            rows.children('td').css('background-color', bgColor);
    
            rows.each((i, row) => processedIds.push(row.id));
            return processedIds;
        }, rowId, url, bgColor);
    }

    async function resaveBankInfo(url) {
        let processedIds = await toolTab.evaluate(url => {
            //debugger;
            let processedIds = [];
                
            $(`tr:contains("${url}")`).each(async (i, row) => {
                processedIds.push(row.id);
                let $row = $(row);
                
                $(row).find('td:first > a:contains("Edit")').click();
            
                let checkExist = await setInterval(() => {
                    let saveLink = $row.find('td:first > a:contains("Save")');
                    if (saveLink) {
                        saveLink.click();
                        clearInterval(checkExist);
                        await setTimeout(() => $row.remove(), 2000);
                    }
                }, 100);
            });

            return processedIds;
        }, url);
        toolTab.waitFor(2000);

        return processedIds;
    }

    async function checkBank(bankInfo, url) {
        console.log("Opening bank tab");
        const bankTab = await browser.newPage();

        await bankTab.goto(url); 
        await bankTab.waitFor(2000);
        const contentHandle = await bankTab.$(bankInfo.selector);
        const content = await bankTab.evaluate(content => content.innerHTML, contentHandle);
        await contentHandle.dispose();
        console.log("Closing bank tab");
        bankTab.close();
        //let content = await bankTab.$$eval(bankInfo.selector, content => content[0].outerHTML);
        return (bankInfo.content.trim() == content.trim());
    }

    

    //con.connect(err => {
    //    if (err) throw err;
        
        logger.info('Fetching relevant banks');
        
        //const firstRowId = await toolTab.$$eval('#rate-table tbody tr:first-of-type', tr => tr[0].id);

        let banks = await toolTab.$$eval('#rate-table tbody tr', (trs, bank1stCharStart, banklastCharStart, pauseExeptions) => {
            return trs.filter( tr => {
                let bankName = tr.querySelector('td.merch-name').textContent;
                let updateFrequency = tr.querySelector('td.update_frequency_txt').textContent;
                let bank1stChar = bankName.charAt(0).toUpperCase();
                
                if (   bank1stChar >= bank1stCharStart && bank1stChar <= banklastCharStart
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

        //logger.info('Got %d banks.', banks.length);

        /*
        //let $ = cheerio.load(rows.join(''));
        //let $tr = $('tr');
        const firstRowId = await toolTab.$$eval('#rate-table tbody tr:first-of-type', tr => tr[0].id);
        */
       //const firstRowId = banks[0].id;
        //for(let bankId of banks) {
        while (banks.length) {
            let color = '';
            let bank = banks[0];
            if (path.extname(bank.url) === '.pdf') {
                //don't check pdfs for phase 1
                console.log('pdf');
                color = '#AED6F1';
            }
            else if (bank.note.includes('Rate collected within')) {
                console.log('zipcode');
                color = '#A9DFBF'
            } else {
                //check for changes
                let bankInfo  = data[bank.url];
                if (bankInfo) {
                    console.log(`Checking ${bank.name} for changes`);
                    let contentMatches = await checkBank(bankInfo, bank.url);
                    if (contentMatches) {
                        //re-save it
                        console.log(`${bank.name} has not changed. Resaving.`);
                        await resaveBankInfo(bank.url);
                        
                    }
                    else {
                        console.log(`${bank.name} has changed!`);
                        color = '#F8C471';
                    }
                } 
                else {
                    missingUrls++;
                    console.log('No record of %s in db. Add it!', bank.name);
                    color = '#EC7063';
                    //let bankRows = getBankRows(banks.slice(i), bank.name);
                    //let remainingBanks = bankRows.filter(id => !affectedRowIds.includes(id));
                    //banks.splice(i, bankRows, ...remainingBanks);
                    //continue;
                }
            }
            //process rows
            //let remainingBankRows = banks.slice(i,i+rowsMoved).filter(b=> b.url != bank.url);
            let processedIds   = await changeRowColor(bank.id, bank.url, color);
            let remainingBanks = processedIds.length > 1
                               ? getRemainingBanks(banks, bank.name, processedIds)
                               : [];
            let numRowsForBank = processedIds.length + remainingBanks.length;
            banks = remainingBanks.concat(banks.slice(numRowsForBank));
        };
       
        logger.info('Processing completed. Of %d bank rows, %d URLs were missing from the DB.', banks.length, missingUrls);
   // con.end();

    //setTimeout(async () => {
    //    await browser.close();
    //}, 60000 * 4);
}
run();

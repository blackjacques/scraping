/*
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
*/
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
//let missingUrls = 0;
let missingBanks = [];
let banksChecked = 0;
let json = require('./page_content.json');
let data = {};
json.RECORDS.forEach(bank => {
    data[bank.url] = {
        selector: bank.selector,
        text: bank.text 
    };
});
const run = async () => {
    const logger = createLogger({
        transports: [
          new transports.Console(),
          new transports.File({ filename: 'deposit_rates.log' })
        ],
        format: format.splat()
    });

    console.log('info', 'Process started.');
    const browser = await puppeteer.launch({
        headless: false //,
        //slowMo: 250 // slow down by 250ms
    });

    const toolTab = await browser.newPage();
    await toolTab.setViewport({ width: 1566, height: 768});

    console.log('Going to Tool page');
    await toolTab.goto(toolPage);
    await toolTab.waitFor(2000);

    console.log('Sorting Banks');

    await toolTab.click(nameHeaderSelector);
    await toolTab.waitFor(3000);

    //one more time
    await toolTab.click(nameHeaderSelector);
    await toolTab.waitFor(3000);


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

    const escapeXpathString = str => {
        const splitedQuotes = str.replace(/'/g, `', "'", '`);
        return `concat('${splitedQuotes}', '')`;
      };

    const clickByText = async (page, text) => {
        const escapedText = escapeXpathString(text);
        const linkHandlers = await page.$x(`//a[contains(@class,'action-link')][contains(text(), ${escapedText})]`);
        
        if (linkHandlers.length > 0) {
          await linkHandlers[0].click();
        } else {
          console.log(`Link not found: ${text}`);
        }
    };

    async function resaveBankInfo(url) {
        let xpath_expression = `//tr[td/span[contains(text(), "${url}")]]/td[1]/a[contains(text(), "Edit")]`;
        const linkHandlers = await toolTab.$x(xpath_expression);
        if (linkHandlers.length > 0) {
            for(let i in linkHandlers) {
                let linkHandler = linkHandlers[i];
                //edit
                await linkHandler.click();

                await toolTab.waitFor(2000);
                
                //now save
                //xpath_expression = `//tr[td/span[contains(text(), "${url}")]]/td[1]/a[contains(text(), "Save")]`;
                //await toolTab.waitForXPath(xpath_expression);
                await clickByText(toolTab, 'Save');
                await toolTab.waitFor(2000);
            }
        } else {
            console.log(`Link not found: ${xpath_expression}`);
        }
    }
    
    async function checkBank(bankInfo, url, bankName) {
        console.log("Opening bank tab");
        const bankTab = await browser.newPage();

        await bankTab.goto(url); 
        await bankTab.waitFor(2000);
        let content = '';
        const contentHandle = await bankTab.$(bankInfo.selector).catch(e => {
            console.log(e);
        });
        if (contentHandle) {
            content = await bankTab.evaluate(content => content.outerHTML, contentHandle);
            await contentHandle.dispose();
        }
        else {
            console.log(`${bankName} selector ${bankInfo.selector} is invalid!`);
        }
        console.log("Closing bank tab");
        bankTab.close();
        //let content = await bankTab.$$eval(bankInfo.selector, content => content[0].outerHTML);
        return (bankInfo.text.trim() == content.trim());
    }

    

    //con.connect(err => {
    //    if (err) throw err;
        
        console.log('Fetching relevant banks');

        let banks = await toolTab.$$eval('#rate-table tbody tr', (trs, bank1stCharStart, banklastCharStart, pauseExeptions) => {
            let banks = {};
            //debugger;
            trs.forEach( tr => {
                let bankName = tr.querySelector('td.merch-name').textContent.trim();
                let updateFrequency = tr.querySelector('td.update_frequency_txt').textContent;
                let bank1stChar = bankName.charAt(0).toUpperCase();
                let url = tr.querySelector('td.merch-link').textContent.trim();
                
                if (   bank1stChar >= bank1stCharStart && bank1stChar <= banklastCharStart
                   && (updateFrequency.toLowerCase() === 'wednesday' || pauseExeptions.includes(bankName)) 
                   && !banks.hasOwnProperty(url)) {   
                    banks[url] = {
                        name: bankName,
                        note: tr.querySelector('td.note').textContent.trim()
                    };
                }
                else {
                    $(tr).remove();
                }
            });
            return banks;
        }, bank1stCharStart, banklastCharStart, pauseExeptions);
        
        //console.log(banks);

        //logger.info('Got %d banks.', banks.length);

        /*
        //let $ = cheerio.load(rows.join(''));
        //let $tr = $('tr');
        const firstRowId = await toolTab.$$eval('#rate-table tbody tr:first-of-type', tr => tr[0].id);
        */
       //const firstRowId = banks[0].id;
        let urls = Object.keys(banks);
        for(let url of urls) {
        //while (banks.length) {
            //let color = '';
            let bank = banks[url];
            if (path.extname(url) === '.pdf') {
                //don't check pdfs for phase 1
                console.log('pdf');
                color = '#AED6F1';
            }
            else if (bank.note.includes('Rate collected within')) {
                console.log('zipcode');
                color = '#A9DFBF'
            } else {
                //check for changes
                banksChecked++;
                let bankInfo  = data[url];
                if (bankInfo) {
                    console.log(`Checking ${bank.name} for changes`);
                    let contentMatches = await checkBank(bankInfo, url, bank.name);
                    if (contentMatches === true) {
                        //re-save it
                        console.log(`${bank.name} has not changed. Resaving.`);
                        //await resaveBankInfo(url); 
                    }
                    else {
                        console.log(`${bank.name} has changed!`);
                        color = '#F8C471';
                    }
                } 
                else {
                    missingBanks.push(url);
                    console.log('No record of %s in db.', url);
                    color = '#EC7063';
                    //let bankRows = getBankRows(banks.slice(i), bank.name);
                    //let remainingBanks = bankRows.filter(id => !affectedRowIds.includes(id));
                    //banks.splice(i, bankRows, ...remainingBanks);
                    //continue;
                }
            }
            await resaveBankInfo(url);
            /*
            //process rows
            //let remainingBankRows = banks.slice(i,i+rowsMoved).filter(b=> b.url != url);
            let processedIds   = await changeRowColor(url, color);
            let remainingBanks = processedIds.length > 1
                               ? getRemainingBanks(banks, bank.name, processedIds)
                               : [];
            let numRowsForBank = processedIds.length + remainingBanks.length;
            banks = remainingBanks.concat(banks.slice(numRowsForBank));
            */
        }
       
        console.log(`Processed ${urls.length} banks between ${bank1stCharStart} and ${banklastCharStart}.`);
        console.log(`Of ${banksChecked} banks checked, ${missingBanks.length} were missing from the DB:`);
        console.log(missingBanks);
   // con.end();

    //setTimeout(async () => {
    //    await browser.close();
    //}, 60000 * 4);
};
run();

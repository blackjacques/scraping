'use strict';

const puppeteer = require('puppeteer');
//const mysql = require('mysql');
const loginPage = 'https://hqfinance.quinstreet.com/qsauthentication/login/';
const toolPage  = 'https://hqfinance.quinstreet.com/tools/deposits-rate-tool';
const creds     = require('./creds.json');
const path = require('path');
const { createLogger, format, transports } = require('winston');
//dom element selectors
const usernameSelector = '#login_form input[name="username"]';
const passwordSelector = '#password';
const buttonSelector   = '#login_button';
const rateTableRows    = '#rate-table > tbody > tr';
const nameHeaderSelector = '#rate-table > thead > tr.table_header > th.merch-name.header';
const bank1stCharStart = 'P';
const banklastCharStart  = 'V';
const pauseExeptions = [
    'American Express National Bank',
    'BBVA Compass (Rate in CA)',
    'TTIA Direct'
];
let json = require('./page_content.json');
let data = {};
json.RECORDS.forEach(bank => {
    data[bank.url] = {
        selector: bank.selector,
        text: bank.text
    };
});
let color        = '';
let missingBanks = [];
let banksChecked = 0;

const run = async () => {
    const logger = createLogger({
        level: 'debug',
        format: format.combine(
          format.splat(),
          format.simple(),
          format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
          }),
          format.printf(info => `${info.timestamp}  ${info.level}: ${info.message}`)
        ),
        // You can also comment out the line above and uncomment the line below for JSON format
        // format: format.json(),
        transports: [
          new transports.Console(),
          new transports.File({ filename: 'deposit_rates.log' })
        ]
    });

    logger.info('info', 'Process started.');
    const browser = await puppeteer.launch({
        headless: false //,
        //slowMo: 250 // slow down by 250ms
    });
    logger.info('Loading Tool page HTML');
    const toolTab = await browser.newPage();
    await toolTab.setViewport({ width: 1566, height: 768});
    await toolTab.goto(loginPage);
    await toolTab.waitFor(3000);

    logger.info('Logging in');
    await toolTab.click(usernameSelector);
    await toolTab.keyboard.type(creds.tool.username);

    await toolTab.click(passwordSelector);
    await toolTab.keyboard.type(creds.tool.password);

    await toolTab.click(buttonSelector);

    await toolTab.waitForNavigation();
    await toolTab.goto(toolPage);

    logger.info('Sorting Banks');

    await toolTab.click(nameHeaderSelector);
    await toolTab.waitFor(3000);

    //one more time
    await toolTab.click(nameHeaderSelector);
    await toolTab.waitFor(3000);

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
          logger.info(`Link not found: ${text}`);
        }
    };

    async function resaveBankInfo(url) {
        url = url.trim();
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
            logger.info(`Link not found: ${xpath_expression}`);
        }
    }

    async function checkBank(bankInfo, url, bankName) {
        logger.info("Opening bank tab");
        const bankTab = await browser.newPage();

        await bankTab.goto(url);
        await bankTab.waitFor(2000);
        let content = '';
        const contentHandle = await bankTab.$(bankInfo.selector).catch(e => {
            logger.error(e);
        });
        if (contentHandle) {
            content = await bankTab.evaluate(content => content.outerHTML, contentHandle);
            await contentHandle.dispose();
        }
        else {
            logger.error(`${bankName} selector ${bankInfo.selector} is invalid!`);
        }
        logger.info("Closing bank tab");
        bankTab.close();
        //let content = await bankTab.$$eval(bankInfo.selector, content => content[0].outerHTML);
        return (bankInfo.text.trim() == content.trim());
    }


    //con.connect(err => {
    //    if (err) throw err;

    logger.info('Fetching relevant banks');

    let banks = await toolTab.$$eval('#rate-table tbody tr',
                        (trs, bank1stCharStart, banklastCharStart, pauseExeptions) => {
        let banks = {};
        //debugger;
        trs.forEach( tr => {
            let bankName = tr.querySelector('td.merch-name').textContent.trim();
            let updateFrequency = tr.querySelector('td.update_frequency_txt').textContent;
            let bank1stChar = bankName.charAt(0).toUpperCase();
            //remove hash (#foo)
            let url = tr.querySelector('td.merch-link').textContent; //.trim().split('#')[0];
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

    //logger.info(banks);

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
            logger.info('pdf');
            color = '#AED6F1';
        }
        else if (bank.note.includes('Rate collected within')) {
            logger.info('zipcode');
            color = '#A9DFBF'
        } else {
            //check for changes
            banksChecked++;
            let bankInfo  = data[url];
            logger.info(`Checking ${bank.name} for changes`);
            if (bankInfo) {
                logger.info(`Checking ${bank.name} for changes`);
                let contentMatches = await checkBank(bankInfo, url, bank.name);
                if (contentMatches === true) {
                    //re-save it
                    logger.info(`${bank.name} has not changed. Resaving.`);
                    //await resaveBankInfo(url);
                }
                else {
                    logger.warn(`${bank.name} has changed!`);
                    color = '#F8C471';
                }
            }
            else {
                missingBanks.push(url);
                logger.info('No record of %s in db.', url);
                color = '#EC7063';
                //let bankRows = getBankRows(banks.slice(i), bank.name);
                //let remainingBanks = bankRows.filter(id => !affectedRowIds.includes(id));
                //banks.splice(i, bankRows, ...remainingBanks);
                //continue;
            }
        }
        await resaveBankInfo(url);
    }

    logger.info(`Processed ${urls.length} banks between ${bank1stCharStart} and ${banklastCharStart}.`);
    logger.info(`Of ${banksChecked} banks checked, ${missingBanks.length} were missing from the DB:`);
    logger.info(missingBanks);
};
    //setTimeout(async () => {
    //    await browser.close();
    //}, 60000 * 4);
run();

const fs = require('fs');

const keyword = 'laptop'
var domain = 'https://www.amazon.com/'
const scraperObject = {
    url: domain,
    async scraper(browser) {
        let page = await browser.newPage();
        await page.goto(this.url);
        // Đợi hiển thị form search sản phẩm
        await page.waitForSelector('#twotabsearchtextbox');
        await page.type('#twotabsearchtextbox', keyword);
        await page.click('#nav-search-submit-button');
        // Đợi hiển thị phân trang sản phẩm 
        await page.waitForSelector('.s-pagination-strip');
        // Lấy thông tin và link sp
        const urls = await page.evaluate(() => {
            let data = document.querySelectorAll(`[data-asin]`);
            let links = [];
            data.forEach(item => {
                if (item.dataset.asin) links.push(item.querySelector('[href]').getAttribute("href"));
            });
            return links;
        });

        console.log(urls);

        let pagePromise = (link) => new Promise(async (resolve, reject) => {
            let newPage = await browser.newPage();
            await newPage.goto(domain + link);
            // await page.waitForSelector('#title_feature_div');
            let dataObj = await newPage.evaluate(() => {
                let dataProduct = {};
                var getValue = function (str) {
                    return document.querySelector(str) ? document.querySelector(str).textContent.trim() : null;
                }
                dataProduct['title'] = getValue('#title_feature_div #productTitle');
                dataProduct['rating'] = getValue('#averageCustomerReviews a span');

                let trPrice = document.querySelectorAll(`#corePrice_desktop table tr`);
                trPrice.forEach(tr => {
                    dataProduct[tr.children[0].textContent.toLowerCase().replace(':', '').trim()] = tr.children[1].querySelector('.a-offscreen').textContent
                });

                let overviewDetail = document.querySelectorAll(`#productOverview_feature_div table tr`);
                dataProduct['overviewDetail'] = {};
                overviewDetail.forEach(tr => {
                    dataProduct['overviewDetail'][tr.children[0].textContent.toLowerCase().trim()] = tr.children[1].textContent.trim()
                });

                let about = document.querySelectorAll(`#featurebullets_feature_div ul li`);
                dataProduct['about'] = [];
                about.forEach(li => {
                    dataProduct['about'].push(li.textContent.trim())
                })

                let media = document.querySelectorAll(`#imageBlock ul li img`);
                dataProduct['media'] = [];
                media.forEach(li => {
                    dataProduct['media'].push(li.src)
                });

                let detail = document.querySelectorAll(`#productDetails_feature_div table`);
                dataProduct['detail'] = {};
                detail.forEach(table => {
                    let trDetail = table.querySelectorAll(`tr`);
                    trDetail.forEach(tr => {
                        dataProduct['detail'][tr.children[0].textContent.toLowerCase().trim()] = tr.children[1].textContent.trim()
                    });
                })

                return dataProduct;
            });
            resolve(dataObj);
            await newPage.close();
        });

        for (link in urls) {
            let currentPageData = await pagePromise(urls[link]);
            console.log(currentPageData);

            fs.readFile('./product.json', function (err, data) {
                if (err) {
                    console.log('Failed read data', err);
                    return;
                }
                let content = data ? JSON.parse(data) : [];
                content.push(currentPageData)
                fs.writeFile('./product.json', JSON.stringify(content, null, 2), (err) => {
                    if (err) {
                        console.log('Failed to write updated data to file');
                        return;
                    }
                    console.log('Updated file successfully');
                });
            });


        }
    }
}

module.exports = scraperObject;
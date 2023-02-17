require('dotenv').config()
const express =require('express')
const app = express()
const nodemailer = require('nodemailer')
const prevPrice = []
const port = process.env.PORT || 3000 
const puppeteer = require('puppeteer')
const cron = require('node-cron')
const {connectDb, User} = require('./DB')
const {join} = require('path')

module.exports = {
  // Changes the cache location for Puppet
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
const start = async () =>{
    try{
        await connectDb(process.env.MONGO_URI)
        console.log('connected')
        async function FETCH(){
            try{
                const browser = await puppeteer.launch()
                const page = await browser.newPage()
                const source = await page.goto(process.env.SOURCE, {timeout: 60000, waitUntil: 'load'})
                const status = source.status()
                console.log("Status", status)
                await page.waitForSelector('[data-test="instrument-price-last"]', {timeout: 0})
                await page.setDefaultNavigationTimeout(0); 
                let price = await page.evaluate(()=>{
                    return document.querySelector('[data-test="instrument-price-last"]').textContent.replace(/[,]/g, "");
                })
                price = Number.parseInt(price)
                if(prevPrice[0] - price >= 1) {
                    const users = await User.find({isTrackingActive: true})
                    console.log('price went down')
                    const transport = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: process.env.EMAIL_USER,
                            pass: process.env.EMAIL_PASS
                        }
                    })
                    users.map(user =>{
                        transport.sendMail({
                            to: user.email,
                            subject: 'BTC PRICE DECLINED',
                            text: `BTC Price went down from ${prevPrice[0]} to ${price}`
                        })
                    })
                }
                prevPrice.push(price)
                browser.close();
            }catch(err){
                console.log(err)
            }
        }
        FETCH()
    }catch(err){
        console.log(err)
    }
}
start()
app.listen(port, () => console.log(`server is up on port ${port}...`))
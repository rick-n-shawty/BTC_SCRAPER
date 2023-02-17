require('dotenv').config()
const express =require('express')
const app = express()
const nodemailer = require('nodemailer')
const port = process.env.PORT || 3000 
const puppeteer = require('puppeteer')
const cron = require('node-cron')
const {connectDb, User, Price} = require('./DB')
const {join} = require('path')
const { ChildProcess } = require('child_process')

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
                const browser = await puppeteer.launch({
                    headless: true,
                    ignoreDefaultArgs: ['--disable-extensions'],
                    args: ['--use-gl=egl', '--no-sandbox', '--disable-setuid-sandbox']
                })
                
                const page = await browser.newPage()
                await page.goto(process.env.SOURCE, {timeout: 0, waitUntil: 'networkidle2'})

                // const status = source.status()
                // console.log("Status", status)
                // await page.waitForSelector('[data-test="instrument-price-last"]'     , {timeout: 0})
                // await page.setDefaultNavigationTimeout(0); 
                let price = await page.evaluate(()=>{
                    return document.querySelector('[data-test="instrument-price-last"]').textContent.replace(/[,]/g, "");
                })
                price = Number.parseInt(price)

                const {prevPrice} = await Price.findOne({name: 'BTC'})

                if(prevPrice - price >= 1 || price < 20000) {
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
                            text: `BTC Price went down from ${prevPrice} to ${price}`
                        })
                    })
                }

                console.log('prev', prevPrice, 'current', price)
                await Price.findOneAndUpdate({name: "BTC"}, {prevPrice: price})
                browser.close();
            }catch(err){
                console.log(err)
            }
        }
        cron.schedule('*/3 * * * *', FETCH) // this is the core of all issues
    }catch(err){
        console.log(err)
    }
}
start()
app.listen(port, () => console.log(`server is up on port ${port}...`))
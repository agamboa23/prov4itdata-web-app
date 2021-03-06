const express = require('express')
const session = require('express-session')
const Grant = require('grant').express()
const path = require('path');
const https = require('https')
const pem = require('pem')
const router = require('./routes/index')
const fs = require('fs')


// Configuration
const fpathAppConfig = path.join(__dirname, 'app-config.json')
const appConfig = JSON.parse(fs.readFileSync(fpathAppConfig, "utf8"))
const environment = appConfig['environment']
// Fail if the configured environment is invalid
if(!Object.keys(appConfig.environmentConfigs).includes(environment)){
    let msg =`"${environment}" is an invalid environment. Valid environments are: ${Object.keys(appConfig.environmentConfigs).join(', ')}`
    throw msg
}
// Initialize environment config
const environmentConfig = appConfig.environmentConfigs[environment]
console.log(`Environment (${environment}) configuration: `, environmentConfig)
const PORT = environmentConfig.port
const USE_HTTPS = environmentConfig.https
const GRANT_CONFIG_FILENAME = path.join(__dirname, environmentConfig.grant.config_filename)
// Initialize Grant
const grant = Grant(require(GRANT_CONFIG_FILENAME))

const logConfig = {
    logConfig : {
        logRoute : true,
        logErrors : true
    }
}


// Web App
const app = express()
app.set('view engine', 'pug')
    .use(session({secret: 'grant', saveUninitialized: true, resave: false}))
    .use(grant)
    // client-side Solid auth
    .use('/solid-auth', express.static(path.join(__dirname, 'solid-auth')))
    .use('/', router(grant,environmentConfig, logConfig))
    .use(express.static('public'))
    .use('/docs', express.static('docs'))

if(USE_HTTPS){
    console.log("USING HTTPS")
    // Enable HTTPS / Create certificate
    pem.createCertificate({ days: 1, selfSigned: true }, function (err, keys) {
        console.log("created certificate")
        if (err) {
            throw err
        }
        https.createServer({ key: keys.serviceKey, cert: keys.certificate }, app).listen(PORT)
    })
}else {
    console.log("USING HTTP")
    app.listen(PORT)
}

var config = {};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                          GENERAL SETTINGS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
config.debug = true; // for additional logging / debugging

config.admin = {
    name: "xWo admin",
    email: "xWo.admin@crypto.zone, adrian.clinciu@gmail.com"
};

config.mongodbURI = "mongodb://username:password@host.mongolab.com:port/database";      // don't need to hardcode this one,
																						// please specify the URI in MONGOLAB_URI env variable

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                       CONFIGURING PLUGINS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

config.mailer = {
	enabled: false,       // Send Emails if true, false to turn off
	sendMailOnStart: true,    // Send 'xMon starting' message if true, not if false
	email: '',    // Your Gmail address
	password: '',       // Your Gmail Password - if not supplied  will prompt on startup.
	tag: '[xWo] ',      // Prefix all email subject lines with this
	sendGrid: {
		api_user: process.env.SENDGRID_USERNAME || 'SENDGRID_USERNAME',
		api_key: process.env.SENDGRID_PASSWORD || 'SENDGRID_PASSWORD'
	},
	user: '',       // Your Email server user name - usually your full Email address 'name@mydomain.com'
	from: '',       // 'name@mydomain.com'
	to: '',       // 'name@somedomain.com, name@someotherdomain.com'
	ssl: true,        // Use SSL (true for Gmail)
	port: '',       // Set if you don't want to use the default port
	tls: false        // Use TLS if true
};

module.exports = config;
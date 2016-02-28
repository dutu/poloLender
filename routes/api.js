/*
 * Serve JSON to our AngularJS client
 */

exports.name = function (req, res) {
  res.json({
	  name: 'Bob',
	  "firstName": "joe",
	  "kids": [{alfa:{name: "2"}}, {omega:{name: "4"}}]
  });
};
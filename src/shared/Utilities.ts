export let constructQueryString = (queryObj) => {
	let queryString = "?";
	for (let key in queryObj) {
		let value = queryObj[key];
		queryString += key + "=" + value + "&";
	}
	return queryString.substr(0, queryString.length - 1);
}
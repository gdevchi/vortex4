exports.isEmpty = (object, fields) => {
  let empty = false;
  for (let field of fields) {
    if (!object[field]) {
      empty = true;
      break;
    }
  }
  return empty;
};

exports.parseCookie = (cookieString) => {
  const cookieArray = cookieString.split('; ');
  let cookieInJson = {};
  // Iterate through each cookie pair
  for (const cookie of cookieArray) {
    const [key, value] = cookie.split('=');
    // Trim any leading or trailing spaces
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();
    cookieInJson[trimmedKey] = trimmedValue;
  }
  return cookieInJson
}
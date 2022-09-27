/* Handle dates */
let handleDate = (params) => {
  let {
    dateString,
    dateFormat = 'yyyy-mm-dd',
  } = params;

  if (!dateString) { return; }

  let date = new Date(dateString);

  let json = {
    yyyy: date.getFullYear(),
    mm: String(date.getMonth() + 1).padStart(2, 0),
    dd: String(date.getDate()).padStart(2, 0),
    HH: String(date.getHours()).padStart(2, 0),
    MM: String(date.getMinutes()).padStart(2, 0),
    SS: String(date.getSeconds()).padStart(2, 0),
    MS: String(date.getMilliseconds()).padStart(3, 0),
  };

  Object.entries(json).forEach(([key, value]) => {
    let patt = new RegExp(key, 'gm');
    dateFormat = dateFormat.replace(patt, value);
  });

  return dateFormat;
};


export { handleDate }

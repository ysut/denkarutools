// Clipboard helper with a fallback for browsers without navigator.clipboard
// (the hospital EMR terminals run IE11 until they are replaced with Edge).
export function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise(function (resolve, reject) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      if (document.execCommand('copy')) {
        resolve();
      } else {
        reject(new Error('execCommand copy failed'));
      }
    } catch (e) {
      reject(e);
    } finally {
      document.body.removeChild(ta);
    }
  });
}

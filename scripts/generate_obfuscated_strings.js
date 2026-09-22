const k = 0x5A;
function enc(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const b = (str.charCodeAt(i) ^ ((k + (i * 13)) & 0xFF)) & 0xFF;
    bytes.push('0x' + b.toString(16).padStart(2, '0'));
  }
  return '{ ' + bytes.join(', ') + ' }';
}

const strings = {
  DELIA_HOST: 'deliadevelopment.com',
  DELIA_PATH: '/api/v1/license/activate',
  DELIA_API_KEY: 'del_sec_2bd77a_15279f204d4545804839060d24aa930122de1d1e7a',
  KEY_API_KEY: 'apiKey',
  KEY_LICENSE: 'license',
  KEY_DEVICE_ID: 'deviceId',
  KEY_SUCCESS: 'success',
  KEY_STATUS: 'status',
  KEY_AUTH_SIG: 'authSig',
  KEY_CODE: 'code',
  KEY_MESSAGE: 'message',
  USER_AGENT: 'DeliaNativeClient/2.0 (Windows NT; x64)',
  CONTENT_TYPE: 'Content-Type: application/json\r\n'
};

let out = `// Auto-generated compile-time obfuscated byte arrays (Key: 0x5A)\n`;
for (const [name, val] of Object.entries(strings)) {
  out += `static const unsigned char ENC_${name}[] = ${enc(val)};\n`;
  out += `static const size_t LEN_${name} = ${val.length};\n`;
}
console.log(out);

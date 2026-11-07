// Funciones en preparación: visibles solo para quien esté en la lista hasta
// que se lancen con el comunicado. Para lanzar una, pon `everyone: true`.

const FEATURES = {
  diet: { everyone: false, emails: ['modetjorge22@gmail.com'] },
};

export function hasFeature(name, email) {
  const f = FEATURES[name];
  if (!f) return false;
  return f.everyone || (email ? f.emails.includes(email.toLowerCase()) : false);
}

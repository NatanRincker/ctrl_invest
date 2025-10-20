const res = await getAnualizedSelicRate();

console.log(res);

async function getAnualizedSelicRate() {
  // One Day Delay becuse
  // Reason: API does not specify the exact time of the day this gets updated
  function getPrevDay() {
    // local time zone limited
    const d = new Date();
    d.setDate(d.getDate() - 1); // handles month/year rollovers
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  const yesterday = getPrevDay();
  const bcb_api_url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.1178/dados?formato=json&dataInicial=${yesterday}&dataFinal=${yesterday}`;
  console.log(bcb_api_url);

  const res = await fetch(bcb_api_url);
  if (!res.ok) {
    return { error: `HTTP ${res.status}` };
  }
  try {
    const selic_data = await res.json();
    // BCB API returns "Taxa Selic", but we want to show to the user the
    // publicly known rate which is actually the "Meta Selic" which is always
    // <Taxa Selic> + 0.1
    // See: https://www.bcb.gov.br/controleinflacao/historicotaxasjuros
    const selic_rate = num(selic_data[0].valor) + 0.1;
    return selic_rate;
  } catch (e) {
    //exception handling here
    console.error(e);
  }
}

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

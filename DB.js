require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
})

const get_status = async() => {
  try{
    const client = await pool.connect();
    const query1 = `
    select faucet_id, s_from, s_to
    from schedules where s_date = NOW()::date;`;
    const query2 = `select * from faucets;`;
    const {rows: rows1} = await client.query(query1);
    const {rows: rows2} = await client.query(query2);
    client.release();
    return [rows1, rows2];
  } catch (error){
    console.log(`[ERROR] get_status query #$# ${error.message} #$#`);
  }
};

const update_schedule = async(faucet_id, schedule) => {
  try{
    const client = await pool.connect();
    const s_dates = schedule.map(({s_date})=>s_date)
    const query1 = `delete from schedules where faucet_id = ${faucet_id} AND s_date IN ('` + s_dates.join('\'::DATE,\'') + '\'::DATE);'
    let query2 = 'insert into schedules(faucet_id, s_date, s_from, s_to) values';
    schedule.forEach((i, index) => {
      if (index != schedule.length-1){
        query2 += `(${faucet_id}, '${i.s_date}'::DATE, '${i.s_from}', '${i.s_to}'),`;
      } else {
        query2 += `(${faucet_id}, '${i.s_date}'::DATE, '${i.s_from}', '${i.s_to}');`;
      }
    });
    await client.query(query1);
    await client.query(query2);
    client.release();
  } catch (error){
    console.log(`[ERROR] update_schedule query #$# ${error.message} #$#`);
  }
};

const get_faucet_stat = async() => {
  try{
    const client = await pool.connect();
    const query = `
    select faucet_id, s_date::TEXT, s_from, s_to
    from schedules where s_date = NOW()::date;`;
    const {rows} = await client.query(query);
    client.release();
    return rows;
  } catch (error){
    console.log(`[ERROR] get_faucet_stat query #$# ${error.message} #$#`);
  }
};

const update_faucet_stat = async(faucet_id, stat) => {
  try{
    const client = await pool.connect();
    const query = `update faucets set is_on = $1 where faucet_id = $2`;
    await client.query(query, [stat, faucet_id]);
    client.release();
  } catch (error){
    console.log(`[ERROR] get_faucet_stat query #$# ${error.message} #$#`);
  }
}

module.exports = {
  get_status,
  update_schedule,
  get_faucet_stat,
  update_faucet_stat
};

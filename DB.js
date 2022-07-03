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
    const now = new Date().toLocaleString('en-US', {timeZone: 'Asia/Tehran'});
    const now_date = now.split(', ')[0];
    const query1 = `
    SELECT id, faucet_id, s_from, s_to
    FROM schedules WHERE s_date = '${now_date}'::DATE
    ORDER BY 1;`;
    const query2 = `SELECT * FROM faucets;`;
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
    const query1 = `
    DELETE FROM schedules 
    WHERE faucet_id = ${faucet_id} 
      AND s_date IN ('` + s_dates.join('\'::DATE,\'') + '\'::DATE)'
      + 'AND id NOT IN (SELECT DISTINCT schedule_id id FROM feedback);';
    let query2 = 'INSERT INTO schedules(faucet_id, s_date, s_from, s_to) VALUES';
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
    const now = new Date().toLocaleString('en-US', {timeZone: 'Asia/Tehran'});
    const now_date = now.split(', ')[0];
    const query = `
    select id, faucet_id, s_date::TEXT, s_from, s_to
    from schedules where s_date = '${now_date}'::DATE;`;
    const {rows} = await client.query(query);
    client.release();
    return rows;
  } catch (error){
    console.log(`[ERROR] get_faucet_stat query #$# ${error.message} #$#`);
  }
};

const update_faucet_stat = async(faucet_id, stat, s_id, now) => {
  try{
    const client = await pool.connect();
    const query1 = `update faucets set is_on = $1 where faucet_id = $2`;
    await client.query(query1, [stat, faucet_id]);
    if (s_id && stat) {
      const schedule_ids = s_id.split(',');
      const query2 = `
      with temp as(select unnest($1::int[]) schedule_id, $2 feedback_time)
      insert into feedback
      select schedule_id, feedback_time from temp t
      where not exists(select * from feedback fe where fe.schedule_id = t.schedule_id)
      OR (
        select DATE_PART('second',to_timestamp(t.feedback_time, 'HH24:MI:SS') - to_timestamp(max(f.feedback_time), 'HH24:MI:SS'))
        from feedback f where f.schedule_id = t.schedule_id
      ) > 10;`
      await client.query(query2, [schedule_ids, now]);
    }
    client.release();
  } catch (error){
    console.log(`[ERROR] get_faucet_stat query #$# ${error.message} #$#`);
  }
}

const get_f_page_data = async(id) => {
  try{
    const client = await pool.connect();
    const query = `
    WITH d1 AS(
      SELECT (s_date::TEXT || ' from ' || s_from || ' to ' || s_to) AS time
      FROM schedules WHERE id = $1
    ), d2 AS(
      SELECT array_agg(feedback_time) f_times
      FROM feedback F
      WHERE schedule_id = $1
    )
    SELECT f_times, time from d1, d2;`;
    const {rows} = await client.query(query, [id]);
    client.release();
    return rows[0];
  } catch (error){
    console.log(`[ERROR] get_f_page_data query #$# ${error.message} #$#`);
  }
}

module.exports = {
  get_status,
  update_schedule,
  get_faucet_stat,
  update_faucet_stat,
  get_f_page_data
};

require('dotenv').config()
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { readFileSync } = require('fs');
const { render } = require('mustache');
const { 
  get_status, 
  update_schedule, 
  get_faucet_stat,
  update_faucet_stat,
  get_f_page_data,
  add_report,
  get_report
} = require('./DB');

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(morgan('combined'));
app.use(cors());

const faucet_schedule_stat = async() => {
  const result = await get_faucet_stat();
  const now = new Date().toLocaleString('en-US', {timeZone: 'Asia/Tehran'});
  let response = {1: false, 2: false, s_id: []};
  result.forEach(i => {
    const from = new Date(`${i.s_date} ${i.s_from}`).toLocaleString('en-US');
    const to = new Date(`${i.s_date} ${i.s_to}`).toLocaleString('en-US');
    if(new Date(from) <= new Date(now) && new Date(now) <= new Date(to)) {
      response[i.faucet_id] = true;
      response.s_id.push(i.id);
    }
  });
  return {...response, s_id: response.s_id.join(',')};
};

//Frontend side endpoints
app.get('/status', async(req, res) => {
  try{
    const result = await get_status();
    const schedule_stat = await faucet_schedule_stat();
    const response = {};
    result[1].forEach(i => {
      const is_ok = i.is_on == schedule_stat[i.faucet_id];
      response[i.faucet_id] = {is_on: i.is_on, is_ok, schedule: []}
    });
    result[0].forEach(i => {
      response[i.faucet_id].schedule.push({s_from: i.s_from, s_to: i.s_to, link:`${process.env.SERVER_URL}/f_page/${i.id}`})
    });
    res.json(response)
  } catch(error){
    console.log(`[ERROR] /status endpoint #$# ${error.message} #$#`);
    res.status(500).json({message: 'An error occurred!'})
  }
});

app.post('/update_schedule', async(req, res)=>{
  try{
    let {faucet_id, schedule} = req.body;
    schedule = schedule.map( i => {
      const s_from = i.s_from + ':00';
      const s_to = i.s_to + ':00';
      return {...i, s_from, s_to}
    })
    await update_schedule(faucet_id, schedule);
    res.json({status: 'OK'})
  } catch(error){
    console.log(`[ERROR] /update_schedule endpoint #$# ${error.message} #$#`);
    res.status(500).json({message: 'An error occurred!'})
  }
});


//Hardware side endpoints
app.get('/faucet_stat', async(req, res) => {
  try {
    const response = await faucet_schedule_stat();
    res.json(response);
  } catch (error) {
    console.log(`[ERROR] /faucet_stat endpoint #$# ${error.message} #$#`);
    res.status(500).json({message: 'An error occurred!'});
  }
});

app.post('/feedback', async(req, res) => {
  try{
    const {faucet_id, stat, s_id} = req.body;
    const now = new Date()
      .toLocaleString('en-US', {timeZone: 'Asia/Tehran', hour12: false})
      .split(', ')[1];
    await update_faucet_stat(faucet_id, stat, s_id, now);
    res.json({status: 'OK'})
  } catch (error) {
    console.log(`[ERROR] /feedback endpoint #$# ${error.message} #$#`);
    res.status(500).json({message: 'An error occurred!'});
  }
});

app.get('/f_page/:id', async(req, res) => {
  try{
    const {id} = req.params;
    const data = await get_f_page_data(id);
    const has_f = data && data.f_times && data.f_times.length ? true : false;
    const view = {...data, has_f};
    const template = readFileSync('./feedback.mustache', 'utf8');
    const response = render(template, view);
    res.send(response)
  } catch (error) {
    console.log(`[ERROR] /f_page endpoint #$# ${error.message} #$#`);
    res.status(500).json({message: 'An error occurred!'});
  }
});

app.post('/report', async(req, res) => {
  try{
    const data = JSON.stringify(req.body);
    const now = new Date()
      .toLocaleString('en-US', {timeZone: 'Asia/Tehran', hour12: false});
    await add_report(now, data);
    res.json({status: 'OK'})
  } catch (error) {
    console.log(`[ERROR] /report endpoint #$# ${error.message} #$#`);
    res.status(500).json({message: 'An error occurred!'});
  }
});

app.get('/', async(req, res) => {
  try{
    const data = await get_report();
    const template = readFileSync('./report.mustache', 'utf8');
    const response = render(template, {data});
    res.send(response)
  } catch (error) {
    console.log(`[ERROR] / endpoint #$# ${error.message} #$#`);
    res.status(500).json({message: 'An error occurred!'});
  }
});

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`App is listening on port ${port}`)
});

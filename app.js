require('dotenv').config()
const express = require('express');
const morgan = require('morgan');
const { 
  get_status, 
  update_schedule, 
  get_faucet_stat,
  update_faucet_stat 
} = require('./DB');

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(morgan('combined'));

//Frontend side endpoints
app.get('/status', async(req, res) => {
  try{
    const result = await get_status();
    const response = {};
    result[1].forEach(i => response[i.faucet_id] = {is_on: i.is_on, schedule: []});
    result[0].forEach(i => {
      response[i.faucet_id].schedule.push({s_from: i.s_from, s_to: i.s_to})
    });
    res.json(response)
  } catch(error){
    console.log(`[ERROR] /status endpoint #$# ${error.message} #$#`);
    res.status(500).json({message: 'An error occurred!'})
  }
});

app.post('/update_schedule', async(req, res)=>{
  try{
    const {faucet_id, schedule} = req.body;
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
    const result = await get_faucet_stat();
    const now = new Date().toLocaleString({timeZone: 'Asia/Tehran'});
    let response = {1: false, 2: false};
    result.forEach(i => {
      const from = new Date(`${i.s_date} ${i.s_from}`).toLocaleString({timeZone: 'Asia/Tehran'});
      const to = new Date(`${i.s_date} ${i.s_to}`).toLocaleString({timeZone: 'Asia/Tehran'});
      if(from <= now && now <= to) {
        response[i.faucet_id] = true;
      }
    })
    res.json(response);
  } catch (error) {
    console.log(`[ERROR] /faucet_stat endpoint #$# ${error.message} #$#`);
    res.status(500).json({message: 'An error occurred!'});
  }
});

app.post('/feedback', async(req, res) => {
  try{
    const {faucet_id, stat} = req.body;
    await update_faucet_stat(faucet_id, stat);
    res.json({status: 'OK'})
  } catch (error) {
    console.log(`[ERROR] /feedback endpoint #$# ${error.message} #$#`);
    res.status(500).json({message: 'An error occurred!'});
  }
});

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`App is listening on port ${port}`)
});

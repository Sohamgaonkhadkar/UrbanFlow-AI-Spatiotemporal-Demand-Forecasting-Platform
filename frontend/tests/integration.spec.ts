import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

const ORIGIN='2016-06-15T12:00:00';
test.beforeEach(async ({page})=>{
  page.on('pageerror',e=>{throw e});
});
async function open(page:Page,route='home'){
 await page.goto(route==='home'?'/':`/#/${route}`);
 await expect(page.getByRole('heading',{name:'URBANFLOW AI',exact:true})).toHaveCount(0,{timeout:30000});
}

test('all six pages render real data without runtime errors or horizontal overflow',async({page})=>{
 for(const route of ['home','overview','forecast','explorer','insights','model']){
   await open(page,route);
   if(route==='home'){await expect(page.locator('#scene-1')).toBeVisible();await expect(page.getByText('INITIALIZING URBAN INTELLIGENCE')).toBeHidden();}
   else await expect(page.locator('h1')).toBeVisible();
   await expect(page.getByRole('alert')).toHaveCount(0);
   await page.waitForTimeout(route==='explorer'?4000:1100);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(2);
   await page.screenshot({path:`../docs/screenshots/${route}.png`,fullPage:true,animations:'disabled'});
 }
});

test('forecast parameters, all horizons, genuine history and CSV match the real API',async({page,request})=>{
 await open(page,'forecast');
 await expect(page.locator('tbody tr')).toHaveCount(12);
 const date=page.locator('input[type=date]'),time=page.locator('input[type=time]');
 await expect(date).toHaveAttribute('min','2016-05-31');
 await expect(date).toHaveAttribute('max','2016-07-01');
 await date.fill('2016-06-15');await time.fill('12:00');
 await page.locator('select:not([aria-label="Forecast model"])').first().selectOption('3');
 for(const [label,h] of [['0.25 hour',1],['1 hour',4],['3 hours',12],['6 hours',24],['12 hours',48]] as const){
   const buttons=page.getByRole('button').filter({hasText:new RegExp(`^${h===1?'0.25 hours':label}`)});
   if(h===1)await page.getByRole('button').filter({hasText:'1 steps'}).click();
   else await buttons.first().click();
   const response=page.waitForResponse(r=>r.url().endsWith('/predict')&&r.request().method()==='POST');
   await page.getByRole('button',{name:/GENERATE FORECAST/}).click();
   const body=await (await response).json();
   expect(body.demo).toBe(false);expect(body.forecast).toHaveLength(h);
   expect(body.history.every((x:{datetime:string})=>new Date(x.datetime)<new Date('2016-06-15T16:00:00Z'))).toBe(true);
   await expect(page.locator('tbody tr')).toHaveCount(h);
   const api=await request.post('/api/predict',{data:{region:3,datetime:ORIGIN,horizon:h}});
   expect(body.forecast).toEqual((await api.json()).forecast);
 }
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:/CSV/}).click();
 const download=await downloadPromise;
 const path=await download.path();const csv=fs.readFileSync(path!,'utf8');
 const result=await (await request.post('/api/predict',{data:{region:3,datetime:ORIGIN,horizon:48}})).json();
 for(const row of result.forecast)expect(csv).toContain(`${row.datetime},${row.prediction.toFixed(2)},`);
 expect(csv).toContain('Frozen v4 historical inference');
});

test('map contains all verified centroids; search, selection, zoom and forecast layer work',async({page,request})=>{
 await open(page,'explorer');
 await expect(page.locator('.uf-marker')).toHaveCount(30);
 const regions=await (await request.get('/api/regions')).json();
 expect(regions).toHaveLength(30);
 await page.getByRole('textbox',{name:'Search regions'}).fill('03');
 await page.locator('ul[aria-label="Regions ranked by activity"] button[data-region="3"]').click();
 await expect(page.locator('.uf-marker[data-region="3"]')).toHaveClass(/is-selected/);
 await page.getByRole('button',{name:'Clear search'}).click();
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();
 await page.getByRole('button',{name:'Zoom out',exact:true}).click();
 const activity=page.waitForResponse(r=>r.url().includes('/activity?')&&r.url().includes('mode=forecast'));
 await page.getByRole('button',{name:'Forecast activity',exact:true}).click();
 const forecast=await (await activity).json();
 expect(forecast.kind).toBe('forecast');expect(forecast.activity).toHaveLength(30);
 await expect(page.getByRole('button',{name:'Forecast activity',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('model page shows backend metrics and excluded capabilities honestly',async({page})=>{
 await open(page,'model');
 await expect(page.getByText('11.61',{exact:true})).toBeVisible();
 await expect(page.getByText('14.56',{exact:true})).toBeVisible();
 await expect(page.getByText('Context only / not a v4 input',{exact:true})).toBeVisible();
 await expect(page.locator('body')).not.toContainText('9.41');
});

test('backend bootstrap outage shows a retryable unavailable state, never demo values',async({page})=>{
 await page.route('**/api/**',route=>route.abort());
 await page.goto('/');
 await expect(page.getByRole('alert')).toContainText('Cannot reach');
 await expect(page.getByRole('button',{name:'Retry connection'})).toBeVisible();
 await expect(page.locator('tbody tr')).toHaveCount(0);
});

test('forecast failure clears model values and preserves an explicit error',async({page})=>{
 await open(page,'forecast');await expect(page.locator('tbody tr')).toHaveCount(12);
 await page.route('**/api/predict',route=>route.fulfill({status:503,json:{detail:'Observation source unavailable; no fallback.'}}));
 await page.getByRole('button',{name:/GENERATE FORECAST/}).click();
 await expect(page.locator('tbody tr')).toHaveCount(0);
 await expect(page.locator('body')).toContainText('Observation source unavailable; no fallback.');
});

test('mobile navigation, pages, and cinematic imagery remain visible',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const route of ['home','overview','forecast','explorer','insights','model']){
   await open(page,route);if(route==='home')await expect(page.getByText('INITIALIZING URBAN INTELLIGENCE')).toBeHidden();await page.waitForTimeout(route==='explorer'?4000:1200);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(2);
   await page.screenshot({path:`../docs/screenshots/${route}-mobile.png`,fullPage:true,animations:'disabled'});
 }
});

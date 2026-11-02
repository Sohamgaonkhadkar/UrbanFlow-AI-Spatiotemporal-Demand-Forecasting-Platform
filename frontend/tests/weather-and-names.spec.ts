import {expect,test} from '@playwright/test';

test('weather mode uses six real inputs and exports the correct model provenance',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/forecast');
 await expect(page.getByLabel('Forecast model')).toHaveValue('baseline');
 await expect(page.locator('tbody tr')).toHaveCount(12);
 await expect(page.getByText('Open-Meteo / Copernicus ERA5')).toBeVisible();
 const response=page.waitForResponse(r=>r.url().endsWith('/predict')&&r.request().postDataJSON()?.model_variant==='weather');
 await page.getByLabel('Forecast model').selectOption('weather');
 const body=await (await response).json();
 expect(body.metadata.weather_used).toBe(true);expect(body.weather.model_used).toBe(true);
 expect(body.metadata.candidate_id).toBe('weather_calendar_feedback_v1');
 await expect(page.getByText('Used in this forecast: six lagged weather features.')).toBeVisible();
 await expect(page.getByText(/weather-mode June diagnostic WAPE is 11.44%/)).toBeVisible();
 await page.screenshot({path:'../docs/screenshots/weather-forecast.png',fullPage:true,animations:'disabled'});
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:/CSV/}).click();
 const download=await downloadPromise;const fs=await import('node:fs');const csv=fs.readFileSync((await download.path())!,'utf8');
 expect(csv).toContain('Experimental weather-aware historical inference');
 await page.getByRole('button',{name:/Model Intelligence/i}).first().click();
 await expect(page.getByText('11.44',{exact:true})).toBeVisible();
 await expect(page.getByText('52 Fitted Features',{exact:true})).toBeVisible();
 await page.screenshot({path:'../docs/screenshots/weather-model.png',fullPage:true,animations:'disabled'});
 await page.getByLabel('Forecast model').selectOption('baseline');
 await expect(page.getByText('11.61',{exact:true})).toBeVisible();
 expect(errors).toEqual([]);
});

test('official centroid area names are searchable and readable on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/#/explorer');
 await expect(page.locator('.uf-marker')).toHaveCount(30);
 await page.getByRole('textbox',{name:'Search regions'}).fill('JFK');
 await page.locator('ul[aria-label="Regions ranked by activity"] button[data-region="3"]').click();
 await expect(page.getByTestId('selected-region')).toHaveText('JFK Airport');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(2);
 await page.screenshot({path:'../docs/screenshots/weather-names-mobile.png',fullPage:true,animations:'disabled'});
});

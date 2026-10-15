import assert from 'node:assert/strict';
import {test} from 'node:test';
import {discoverRoutes,translationPaths} from '../lib/content.ts';
import {pageMetadata,indexable,siteUrl} from '../lib/seo.ts';
test('every discovered page has a unique canonical and only real hreflang alternatives',()=>{
 for(const route of discoverRoutes()){
   const metadata=pageMetadata(route.locale,route.parts);
   assert.equal(metadata.alternates?.canonical,siteUrl()+route.path);
   const translations=translationPaths(route.locale,route.parts);
   for(const [locale,path] of Object.entries(translations))assert.equal(new Map(Object.entries(metadata.alternates?.languages??{})).get(locale),siteUrl()+path);
   assert.equal(metadata.alternates?.languages?.['x-default'],siteUrl()+(translations.en??route.path));
 }
});
test('indexing can be deliberately enabled and returns to noindex by default',()=>{
 const original=process.env.SITE_INDEXABLE;
 try{
   delete process.env.SITE_INDEXABLE;assert.equal(indexable(),false);
   process.env.SITE_INDEXABLE='true';assert.equal(indexable(),true);
   assert.deepEqual(pageMetadata('en',[]).robots,{index:true,follow:true});
   process.env.SITE_INDEXABLE='false';assert.deepEqual(pageMetadata('en',[]).robots,{index:false,follow:true});
 }finally{if(original===undefined)delete process.env.SITE_INDEXABLE;else process.env.SITE_INDEXABLE=original;}
});

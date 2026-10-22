/** @type {import('next').NextConfig} */
const nextConfig={
 reactStrictMode:true,
 serverExternalPackages:['mammoth','unpdf'],
 async headers(){return [
  {source:'/(.*)',headers:[
   // Só a prévia de desenvolvimento em iframe pode omitir esta proteção.
   ...(process.env.ARENA_PREVIEW==='true'?[]:[{key:'X-Frame-Options',value:'SAMEORIGIN'}]),
   {key:'X-Content-Type-Options',value:'nosniff'},
   {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  ]},
  {source:'/api/auth/:path*',headers:[{key:'Cache-Control',value:'no-store'}]},
  {source:'/redefinir-senha',headers:[{key:'Referrer-Policy',value:'no-referrer'},{key:'Cache-Control',value:'no-store'}]},
  {source:'/entrevista/:path*',headers:[{key:'Referrer-Policy',value:'no-referrer'},{key:'Cache-Control',value:'no-store'}]},
  {source:'/api/entrevista/:path*',headers:[{key:'Referrer-Policy',value:'no-referrer'},{key:'Cache-Control',value:'no-store'}]},
 ];},
};
module.exports=nextConfig;

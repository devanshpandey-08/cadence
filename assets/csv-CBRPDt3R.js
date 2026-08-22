function r(n){let t=String(n??"");return/^[=+\-@\t\r]/.test(t)&&(t=`'${t}`),`"${t.replace(/"/g,'""')}"`}function i(n,t){return[n.join(","),...t.map(e=>e.map(r).join(","))].join(`
`)}export{r as c,i as t};

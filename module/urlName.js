
exports.name= (nameLink)=>{
    let hh = nameLink
    let h1 = hh.split("")
    let h2 = h1.indexOf("@")
    let h3 = h1.slice(0, h2)
    return h3.join('')
}

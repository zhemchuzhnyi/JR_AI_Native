const greeting = name => {
    if(!name) return 'Enter a name'
    return `Hello, ${name}!`
}

console.log(greeting('Alex'))
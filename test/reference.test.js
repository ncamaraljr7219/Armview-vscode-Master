const ARMParser = require('../out/lib/arm-parser').default
const fs = require('fs')

const chai = require('chai')
const expect = chai.expect
chai.use(require('chai-subset'))

console.log = function(s) {}

var parser = new ARMParser('', 'main', null, null)

// Run ARMParser on given filename
async function loadTemplate(filename) {
  let template = fs.readFileSync(filename)
  try {
    return await parser.parse(template.toString())
  } catch(err) {
    return err
  }
}

//
//
//
describe('Test: basic.json', function() {
  let res
  it('Parse file', async function() {
    res = await loadTemplate('test/ref/basic.json')
  })
  it('Validate nodes & edges', async function() {
    expect(res).to.have.lengthOf(8)
    let edgeCount = 0
    for(let node of res) {
      if(node.group == 'nodes') continue
      expect(node.data).to.have.nested.property('id')
      expect(node.data).to.have.nested.property('source')
      expect(node.data).to.have.nested.property('target')
      edgeCount++
    }
    expect(edgeCount).to.equal(4)
  })
})

//
//
//
describe('Test: vars-params.json', function() {
  let res
  it('Parse file', async function() {
    res = await loadTemplate('test/ref/vars-params.json')
  })

  it('Validate node count', async function() {
    expect(res).to.have.lengthOf(8)
  })

  it('Validate var & param substitution', async function() {
    expect(res).to.be.an('array').to.containSubset([{data:{name:'Lou%20Reed'}}])
    expect(res).to.be.an('array').to.containSubset([{data:{name:'Waters'}}])
    expect(res).to.be.an('array').to.containSubset([{data:{name:'Zappa'}}])
    expect(res).to.be.an('array').to.containSubset([{data:{name:'Bowie'}}])
    expect(res).to.be.an('array').to.containSubset([{data:{name:'Iommi'}}])
    expect(res).to.be.an('array').to.containSubset([{data:{name:'Osbourne'}}])
    expect(res).to.be.an('array').to.containSubset([{data:{name:'Cheese_A%20simple%20var'}}])
    expect(res).to.be.an('array').to.containSubset([{data:{name:'A%20simple%20var_A%20simple%20name'}}])
  })
})

//
//
//
describe('Test: linked.json', function() {
  let res
  it('Parse file', async function() {
    res = await loadTemplate('test/ref/linked.json')
  })

  it('Validate node count', async function() {
    expect(res).to.have.lengthOf(8)
  })

  it('Validate linked template', async function() {
    // !NOTE! Without a VS Code instance/workspace we can't fully test linked template resolution
    expect(res).to.be.an('array').to.containSubset([{data:{name:'aks101cluster'}}])
  })
})

//
//
//
describe('Test: expressions.json', function() {
  let res
  it('Parse file', async function() {
    res = await loadTemplate('test/ref/expressions.json')
  })

  it('Validate node count', async function() {
    expect(res).to.have.lengthOf(6)
  })

  it('Validate expression evaluation', async function() {
    expect(res).to.be.an('array').to.containSubset([{data:{name:'TWO'}}])
    expect(res).to.be.an('array').to.containSubset([{data:{name:'that%20at%20ok%20ZIS'}}])
    expect(res).to.be.an('array').to.containSubset([{data:{name:'http%3A%2F%2Fexample.com%2Fuser.js'}}])
    expect(res).to.be.an('array').to.containSubset([{data:{name:'LTM4NjUwNDUwNw'}}])
    expect(res).to.be.an('array').to.containSubset([{data:{name:'977d95b7-70c9-5b8a-9a61-ebc22fb8167f'}}])
    expect(res).to.be.an('array').to.containSubset([{data:{name:'zone-foo_web5'}}])
  })
})

//
//
//
describe('Test: test-bug.json', function() {
  let res
  it('Parse file', async function() {
    res = await loadTemplate('test/ref/test-bug.json')
  })

  it('Validate JSON backslash v bug', async function() {
    expect(res[0].data.name).to.eq('test%20%5Cvery%20lemons')
    expect(res[0].data.extra['template-url']).to.eq('Resources\\virtualMachines\\ScaleSetTemplate.json')
  })
})

//
// arm-parser-expressions.ts - ARM Parser
// Class to parse ARM template expressions, e.g. stuff inside square brackets []
//

import * as utils from './utils'
import { v5 as uuidv5 } from 'uuid' // For version 5
import { Template } from './arm-parser-types'

export default class ARMExpressionParser {
  public template: Template

  // We store the template to save use passing it millions of times
  constructor(t: Template) {
    this.template = t
  }

  //
  // Main ARM expression parser, attempts to evaluate and resolve ARM expressions
  // Most of the time it will evaluate down to a string, but a number can be returned also
  //
  public eval(exp: string, check = false): any {
    // Precheck called on top level calls to _evalExpression
    if (check) {
      const matchExp = exp.match(/^\[(.*)\]$/)
      if (matchExp) {
        exp = matchExp[1]
      } else {
        return exp
      }
    }

    // Catch some rare errors where non-strings are parsed
    if (typeof exp !== 'string') {
      return exp
    }

    exp = exp.trim()

    // It looks like a function call with a property reference e.g foo().bar or foo()['bar']
    let match = exp.match(/(\w+)\((.*)\)((?:\.|\[).*)/)
    let funcProps
    if (match) {
      const funcName = match[1]
      const funcParams = match[2]
      funcProps = match[3]

      // Catch some special cases, with referenced properties, e.g. resourceGroup().location
      if (funcName === 'resourceGroup' && funcProps === '.id') { return '{res-group-id}' }
      if (funcName === 'resourceGroup' && funcProps === '.location') { return '{res-group-location}' }
      if (funcName === 'subscription' && funcProps === '.subscriptionid') { return '{subscription-id}' }
      if (funcName === 'deployment' && funcProps === '.name') { return '{deployment-name}' }

      if (funcName === 'variables') {
        return this.funcVarParam(this.template.variables, this.eval(funcParams), funcProps)
      }

      if (funcName === 'parameters') {
        return this.funcVarParam(this.template.parameters, this.eval(funcParams), funcProps)
      }
    }

    // It looks like a 'plain' function call without . something after it
    // For historic reasons we treat these separate and I don't want to mess with it, as it works
    match = exp.match(/(\w+)\((.*)\)/)
    if (match) {
      const funcName = match[1].toLowerCase()
      const funcParams = match[2]

      if (funcName === 'variables') {
        return this.funcVarParam(this.template.variables, this.eval(funcParams), '')
      }
      if (funcName === 'parameters') {
        return this.funcVarParam(this.template.parameters, this.eval(funcParams), '')
      }
      if (funcName === 'uniquestring') {
        return this.funcUniqueString(this.eval(funcParams))
      }
      if (funcName === 'concat') {
        return this.funcConcat(funcParams, '')
      }
      if (funcName === 'uri') {
        return this.funcUri(funcParams)
      }
      if (funcName === 'replace') {
        return this.funcReplace(funcParams)
      }
      if (funcName === 'take') {
        return this.funcTake(funcParams)
      }
      if (funcName === 'tolower') {
        return this.funcToLower(funcParams)
      }
      if (funcName === 'toupper') {
        return this.funcToUpper(funcParams)
      }
      if (funcName === 'substring') {
        return this.funcSubstring(funcParams)
      }
      if (funcName === 'resourceid') {
        // Treat resourceId as a concat operation with slashes
        let resid = this.funcConcat(funcParams, '/')
        // clean up needed
        resid = resid.replace(/^\//, '')
        resid = resid.replace(/\/\//, '/')
        return resid
      }
      if (funcName === 'copyindex') {
        return 0
      }
      if (funcName === 'guid') {
        return uuidv5(this.funcConcat(funcParams, ''), '36c56b01-f9c9-4c7d-9786-0372733417ea')
      }
    }

    // It looks like a string literal in single quotes
    match = exp.match(/^'(.*)'$/)
    if (match) {
      return match[1]
    }

    // It looks like a number literal
    match = exp.match(/^(\d+)/)
    if (match) {
      return match[1].toString()
    }

    // Catch all, just return the expression, unparsed
    return exp
  }

  //
  // Emulate the ARM function `variables()` and `parameters()` to reference template variables/parameters
  // The only difference is the source
  //
  private funcVarParam(source: any, varName: string, propAccessor: string): string {
    // propAccessor is the . or [] part of the object accessor
    // the [] notation requires some pre-processing for expressions e.g. foo[variable('bar')]
    if (propAccessor && propAccessor.charAt(0) === '['
       && !(propAccessor.charAt(1) >= '0' && propAccessor.charAt(1) <= '9')
       && !(propAccessor.charAt(1) === '\'')) {
      // Evaluate propAccessor in case it includes an expression
      let propAccessorResolved = this.eval(propAccessor, false)

      // If we get a string back it need's quoting, e.g. foo['baz']
      if (typeof propAccessorResolved === 'string') {
        propAccessorResolved = `'${propAccessorResolved}'`
      }
      // Otherwise it's hopefully a number
      propAccessor = `[${propAccessorResolved}]`
    }

    if (!source) { return '{undefined}' }
    const findKey = Object.keys(source).find(key => varName === key)

    if (findKey) {
      let val

      // For parameters we access `defaultValue`
      if (source === this.template.parameters) {
        val = source[findKey].defaultValue
        // Without a defaultValue it is impossible to know what the parameters value could be!
        // So a fall-back out is to return the param name inside {}
        if (!val && val !== 0) {
          return `{${this.eval(varName)}}`
        }
      } else {
        // For variables we use the actual value
        val = source[findKey]
      }

      // Variables can be JSON objects, MASSIVE SIGH LOOK AT THIS INSANITY
      if (typeof(val) === 'object') {
        if (!propAccessor) {
          // We're dealing with an object and have no property accessor, nothing we can do
          return `{${JSON.stringify(val)}}`
        }

        // Hack to try to handle copyIndex, default to first item in array
        propAccessor = propAccessor.replace('copyIndex()', '0')

        // Use eval to access property, I'm not happy about it, but don't have a choice
        try {
          // tslint:disable-next-line: no-eval
          const evalResult = eval('val' + propAccessor)

          if (typeof(evalResult) === 'undefined') {
            console.log(`### ArmView: Warn! Your template contains invalid references: ${varName} -> ${propAccessor}`)
            return '{undefined}'
          }

          if (typeof(evalResult) === 'string') {
            // variable references values can be expressions too, so down the rabbit hole we go...
            return this.eval(evalResult, true)
          }

          if (typeof(evalResult) === 'object') {
            // We got an object back, give up
            return `{${JSON.stringify(evalResult)}}`
          }
        } catch (err) {
          console.log(`### ArmView: Warn! Your template contains invalid references: ${varName} -> ${propAccessor}`)
          return '{undefined}'
        }
      }

      if (typeof(val) === 'string') {
        // variable values can be expressions too, so down the rabbit hole we go...
        return this.eval(val, true)
      }

      // Fall back
      return val
    } else {
      console.log(`### ArmView: Warn! Your template contains invalid references: ${varName} -> ${propAccessor}`)
      return '{undefined}'
    }
  }

  //
  // Emulate the ARM function `uniqueString()`
  //
  private funcUniqueString(baseStr: string): string {
    const hash = utils.hashCode(baseStr)
    return Buffer.from(`${hash}`).toString('base64').substr(0, 14)
  }

  //
  // Emulate the ARM function `concat()`
  //
  private funcConcat(funcParams: string, joinStr: string): string {
    const paramList = this.parseParams(funcParams)

    let res = ''
    for (const p in paramList) {
      let param = paramList[p]
      try {
        param = param.trim()
      } catch (err) {
        // Nothing
      }
      res += joinStr + this.eval(param)
    }
    return res
  }

  //
  // Emulate the ARM function `uri()`
  //
  private funcUri(funcParams: string): string {
    const paramList = this.parseParams(funcParams)

    if (paramList.length === 2) {
      let sep = ''
      let base = this.eval(paramList[0])
      const rel = this.eval(paramList[1])
      if (!(base.endsWith('/') || rel.startsWith('/'))) { sep = '/' }
      if (base.endsWith('/') && rel.startsWith('/')) {
        sep = ''
        base = base.substr(0, base.length - 1)
      }

      return base + sep + rel
    }

    return '{invalid-uri}'
  }

  //
  // Emulate the ARM function `replace()`
  //
  private funcReplace(funcParams: string): string {
    const paramList = this.parseParams(funcParams)
    const input = this.eval(paramList[0])
    const search = this.eval(paramList[1])
    const replace = this.eval(paramList[2])

    return input.replace(new RegExp(search, 'g'), replace)
  }

  //
  // Emulate the ARM function `toLower()`
  //
  private funcToLower(funcParams: string): string {
    return this.eval(funcParams).toLowerCase()
  }

  //
  // Emulate the ARM function `toUpper()`
  //
  private funcToUpper(funcParams: string): string {
    return this.eval(funcParams).toUpperCase()
  }

  //
  // Emulate the ARM function `substring()`
  //
  private funcSubstring(funcParams: string): string {
    const paramList = this.parseParams(funcParams)
    const str = this.eval(paramList[0])
    const start = parseInt(this.eval(paramList[1]), 10)
    const len = parseInt(this.eval(paramList[2]), 10)

    return this.eval(str).substring(start, start + len)
  }

  //
  // Emulate the ARM function `take()`
  //
  private funcTake(funcParams: string): string {
    const paramList = this.parseParams(funcParams)
    const value = this.eval(paramList[0])
    const count = parseInt(this.eval(paramList[1]), 10)

    // Could be an array or string, but JS doesn't care
    return this.eval(value[count])
  }

  //
  // This is a brute force parser for comma separated parameter lists in function calls, e.g. foo(bar, thing(1, 2))
  //
  private parseParams(paramString: string): string[] {
    // Parsing non-nested commas in a param list is IMPOSSIBLE WITH A REGEX
    let depth = 0
    const parts = []
    let lastSplit = 0
    for (let i = 0; i < paramString.length; i++) {
      const c = paramString.charAt(i) // paramString[i];
      if (c === '(') { depth++ }
      if (c === ')') { depth-- }

      const endOfString = i === paramString.length - 1
      if ((c === ',' && depth === 0) || endOfString) {
        const endPoint = endOfString ? paramString.length : i
        parts.push(paramString.substring(lastSplit, endPoint).trim())
        lastSplit = i + 1
      }
    }
    return parts
  }

}

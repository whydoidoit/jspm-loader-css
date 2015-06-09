const BUILD_MODE = typeof window === 'undefined'
import Core from 'css-modules-loader-core'
import path from 'path'

let numElems = 0
class CSSLoader {
  constructor( plugins, moduleName ) {
    this.fetch = this.fetch.bind( this )
    this.bundle = this.bundle.bind( this )
    this.moduleName = moduleName || __moduleName
    this.core = new Core( plugins )
    this._cache = { _source: [] }
  }

  fetch( load, fetch ) {
    // Use the default Load to fetch the source
    return fetch( load ).then( source => {
      // Pass this to the CSS Modules core to be translated
      // triggerImport is how dependencies are resolved
      return this.core.load( source, load.metadata.pluginArgument, "A", this.triggerImport.bind( this ) )
    } ).then( ( { injectableSource, exportTokens } ) => {
      console.log( { injectableSource, exportTokens } )
      if ( BUILD_MODE ) {
        this._cache["./" + load.metadata.pluginArgument] = exportTokens
        this._cache._source.push( injectableSource )
        return `export default ${JSON.stringify( exportTokens )}`
      } else {
        // Once our dependencies are resolved, inject ourselves
        let id = this.createElement( injectableSource )
        return `export let __hotReload = () => document.getElementById('${id}').remove(); export default ${JSON.stringify( exportTokens )}`
      }
      // And return out exported variables
    } )
  }

// Uses a <link> with a Blob URL if that API is available, since that
// has a preferable debugging experience. Falls back to a simple <style>
// tag if not.
  createElement( source ) {
    let head = document.getElementsByTagName( 'head' )[0],
      cssElement

    if ( !window.Blob || !window.URL || !URL.createObjectURL || navigator.userAgent.match( /phantomjs/i ) ) {
      cssElement = document.createElement( 'style' )
      cssElement.innerHTML = source
    } else {
      let blob = new Blob( [source], { type: 'text/css' } ),
        url = URL.createObjectURL( blob )

      cssElement = document.createElement( 'link' )
      cssElement.setAttribute( 'href', url )
      cssElement.setAttribute( 'rel', 'stylesheet' )
    }
    let id = `jspm-css-loader-${numElems++}`
    cssElement.setAttribute( 'id', id )
    head.appendChild( cssElement )
    return id
  }

  triggerImport( _newPath, relativeTo, trace ) {
    // Figure out the path that System will need to find the right file,
    // and trigger the import (which will instantiate this loader once more)
    let newPath = _newPath.replace( /^["']|["']$/g, "" ),
      rootRelativePath = "." + path.resolve( path.dirname( relativeTo ), newPath )
    return System.import( `${rootRelativePath}!${this.moduleName}` ).then( exportedTokens => {
      // If we're in BUILD_MODE, the tokens aren't actually returned,
      // but they have been added into our cache.
      return BUILD_MODE ? this._cache[rootRelativePath] : exportedTokens.default
    } )
  }

  bundle( loads, opts ) {
    console.log( loads, opts )
    let css = this._cache._source.join( "\n" )
      .replace( /(["\\])/g, '\\$1' )
      .replace( /[\f]/g, "\\f" )
      .replace( /[\b]/g, "\\b" )
      .replace( /[\n]/g, "\\n" )
      .replace( /[\t]/g, "\\t" )
      .replace( /[\r]/g, "\\r" )
      .replace( /[\u2028]/g, "\\u2028" )
      .replace( /[\u2029]/g, "\\u2029" );
    return `(function(c){var d=document,a='appendChild',i='styleSheet',s=d.createElement('style');s.type='text/css';d.getElementsByTagName('head')[0][a](s);s[i]?s[i].cssText=c:s[a](d.createTextNode(c));})("${css}");`
  }
}

export {CSSLoader,Core}
export default new CSSLoader( [
  Core.extractImports,
  Core.scope
] )

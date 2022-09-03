

        var crypto    = require('crypto');

        var websocket;
        var buffer;
        
        
        function upgrade(req,socket,head){
                                                                      console.log('upgrade');
              if(req.headers['upgrade']!=='websocket'){
                    socket.end('HTTP/1.1 400 Bad Request');
                    return;
              }

              var headers   = [
                    'HTTP/1.1 101 Web Socket Protocol Handshake',
                    'Upgrade: WebSocket',
                    'Connection: Upgrade'
              ];
                            
              var key   = req.headers['sec-websocket-key'];              
              if(key){
                    var hash    = genhash(key)
                    headers.push('Sec-WebSocket-Accept: '+hash);
              }

              headers   = headers.join('\r\n');
              headers  += '\r\n\r\n';
              socket.write(headers);


              buffer        = Buffer.alloc(0);
              websocket     = socket;
              websocket.on('data',rec);
              
              send.text('hello');
              
              
              function genhash(key){
              
                    var fn      = crypto.createHash('sha1');
                    var data    = fn.update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11','binary');
                    var b64     = data.digest('base64');
                    return b64;
                  
              }//genhash        
              
        }//upgrade
        
        
        function rec(data){

              buffer    = Buffer.concat([buffer,data]);
                                                      
              if(buffer.length<2)return;
                                                      
              var byte0     = buffer.readUInt8(0);
              var opcode    = byte0 & 15;

              switch(opcode){
              
                case 0    :                 break;    // continuation
                case 1    : rec.text();     break;    // text frame
                case 2    :                 break;    // binary
                case 8    : rec.close();    break;    // close
                
              }//switch

        }//rec
        
        rec.close=function(){

              send.close();
              websocket.destroy();
              
        }//close
        
        rec.text=function(){

              var byte1     = buffer.readUInt8(1);
              
              var ext       = 0;
              var paylen    = byte1 & 127;
              
              if(paylen===126){
                    if(buffer.length<4)return;
                    ext       = 2;
                    paylen    = buffer.readUInt16BE(2);
              }
              if(paylen===127){
                    if(buffer.length<10)return;
                    ext       = 8;
                    paylen    = buffer.readUInt64BE(2);
              }
              
              var offset    = 2+ext;
              var start     = offset+4;
              var end       = start+paylen; 
              
              if(buffer.length<end)return;
              
              var mask      = buffer.slice(offset,start);
              var payload   = buffer.slice(start,end);
              
              for(var i=0;i<payload.length;i++){
              
                    var byte    = payload.readUInt8(i);
                    byte        = byte ^ mask[i%4];
                    payload.writeUInt8(byte,i);
                    
              }//for

              buffer        = buffer.slice(end);

              
              //msgrec(payload);
              
              var str   = payload.toString();
              console.log(str);
              
        }//rec.text
        
        
        function send(buffer){
        
              websocket.write(buffer);
              
        }//send
        
        send.text=function(str){
        
              var payload   = Buffer.from(str);
              var len       = payload.length;
              
              var ext       = 0;
              var paylen    = len;
              
              if(len>125){
                    ext       = 2;
                    paylen    = 126;
              }
              if(len>Math.pow(2,16)){
                    ext       = 8;
                    paylen    = 127;
              }
              
              var offset    = 2+ext;
              var size      = offset+len;
              var buffer    = Buffer.alloc(size);
              
              var byte0     = 128 | 1;
              buffer.writeUInt8(byte0,0);
              
              var byte1     = paylen;
              buffer.writeUInt8(byte1,1);
              
              if(paylen===126){
                    buffer.writeUInt16BE(len,2);
              }
              if(paylen===127){
                    buffer.writeUInt64BE(len,2);
              }
              
              payload.copy(buffer,offset);
              
              send(buffer);
              
        }//send.text
        
        send.close=function(){
        
              var buffer    = Buffer.alloc(2);
              
              var byte0     = 128 | 8;
              buffer.writeUInt8(byte0,0);
              
              send(buffer);
              
        }//send.close
        
        

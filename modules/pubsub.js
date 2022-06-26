topic_subscriptions = {
  //"topic":["client1_id","client2_id",...]
}
/*client_topics = {
  //"client1_id":[]
}*/
client_ids = {
  //"client_id":client_obj
}

function print_status(){
  console.log("topic_subscriptions =",topic_subscriptions)
  console.log("client_ids =",client_ids)
}

function subscribe(client,topic){
  //Aggiungi il mapping id->client
  if(!(client.id in client_ids)){ 
    client_ids[client.id]=client
  }
  //Aggiungi il mapping topic->ids
  if(!(topic in topic_subscriptions)){ 
    topic_subscriptions[topic] = [client.id]
  } else {
    topic_subscriptions[topic].push(client.id)
  }
  /*//Aggiungi il mapping id->topics
  if(!(client.id in client_topics)){
    client_topics[client.id] = [topic]
  } else {
    client_topics[client.id].push(topic)
  }*/
  print_status()
}

function unsubscribe(client,topic){
  if((topic in topic_subscriptions)){
    let i = topic_subscriptions[topic].indexOf(client.id)
    if(i!=-1){
      topic_subscriptions[topic].splice(i,1) //elimina un elemento dall'array
    }

    if(topic_subscriptions[topic].length==0){
      delete client_ids[client.id]
    }
  } else {
    delete client_ids[client.id]
  }
  print_status()
}

function publish(topic,data){
  if(!(topic in topic_subscriptions)){
    return
  }
  topic_subscriptions[topic].forEach(ws => {
    let payload = {
      topic: topic,
      message: data
    }
    ws.send(JSON.stringify(payload))
  });
}

module.exports = {
  subscribe: subscribe,
  unsubscribe: unsubscribe,
  publish: publish
}
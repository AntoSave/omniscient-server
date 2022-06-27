topic_subscriptions = {
  //"topic":["client1_id","client2_id",...]
}
client_topics = {
  //"client1_id":[]
}
client_ids = {
  //"client_id":client_obj
}

function print_status(){
  console.log("topic_subscriptions =",topic_subscriptions)
  console.log("client_topics =",client_topics)
  console.log("client_ids =",Object.keys(client_ids))
}

function subscribe(client,topic){
  //Aggiungi il mapping id->client
  if(!(client.id in client_ids)){ 
    client_ids[client.id]=client
  }
  //Aggiungi il mapping topic->ids
  if(!(topic in topic_subscriptions)){ 
    topic_subscriptions[topic] = new Set([client.id])
  } else {
    topic_subscriptions[topic].add(client.id)
  }
  //Aggiungi il mapping id->topics
  if(!(client.id in client_topics)){
    client_topics[client.id] = new Set([topic])
  } else {
    client_topics[client.id].add(topic)
  }
  print_status()
}

function unsubscribe(client,topic){
  if((topic in topic_subscriptions) || (client.id in client_topics)){
    topic_subscriptions[topic].delete(client.id)
    client_topics[client.id].delete(topic)

    if(client_topics[client.id].size==0){
      delete client_topics[client.id]
      delete client_ids[client.id]
    }
  } else {
    delete client_ids[client.id]
  }
  print_status()
}

function unsubscribeAll(client){
  if(!(client.id in client_topics)) {
    delete client_ids[client.id]
    print_status()
    return
  }
  client_topics[client.id].forEach(topic => {
    topic_subscriptions[topic].delete(client.id)
  })
  delete client_topics[client.id]
  delete client_ids[client.id]
  print_status()
}

function publish(topic,data){
  if(!(topic in topic_subscriptions)){
    return
  }
  topic_subscriptions[topic].forEach(client_id => {
    let ws = client_ids[client_id]
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
  publish: publish,
  unsubscribeAll: unsubscribeAll
}
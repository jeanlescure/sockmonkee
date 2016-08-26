var socket = io();
var SOCK_ID;
var ROOM_ID = window.location.href.replace(/^.*?([^\/]*?)\/{0,1}$/g,"$1");
var USER = '';
var members = [];

socket.on('connect', function(){
  if (SOCK_ID){
    socket.removeListener('sock.broadcast.' + ROOM_ID + '.' + SOCK_ID, bcastHandle);
  }

  SOCK_ID = socket.id;

  socket.on('sock.enter.' + ROOM_ID, function(user){
    listenTo(user.id);
    if (verify_user() && user.id !== SOCK_ID) socket.emit('sock.ack.' + ROOM_ID, { to: user.id, from: { name: USER, id: SOCK_ID } });
    append_name(user.name, user.id);
    console.log('entered: ', user);
  });

  socket.on('sock.ack.' + ROOM_ID + '.' + SOCK_ID, function(user){
    listenTo(user.id);
    append_name(user.name, user.id);
    console.log('acknowledged: ', user);
  });

  join();
});

function join() {
  if (verify_user()) socket.emit('sock.join.' + ROOM_ID, { name: USER, id: SOCK_ID });
}

function listenTo(id) {
  if (!_.includes(members, id)) {
    socket.on('sock.broadcast.' + ROOM_ID + '.' + id, bcastHandle);
    members.push(id);
  }
}

function bcastHandle(msg) {
  if (msg.sender.id !== SOCK_ID && msg.type === 'text'){
    append_msg(msg, true);
  }

  if (msg.sender.id !== SOCK_ID && msg.type === 'file'){
    append_link(msg, true);
  }
}

$(function(){
  $('.btn_send').click(function(){
    var msg = $('#msgText').val();

    var sock_msg = {
      sender: { name: USER, id: SOCK_ID },
      msg: msg,
      type: 'text',
      timestamp: moment().valueOf()
    };

    append_msg(sock_msg);
    $('#msgText').val('');

    socket.emit('sock.message', sock_msg);
  });

  $('#msgText').keypress(function (e) {
    var code = (e.keyCode ? e.keyCode : e.which);

    if (code == 13 && !(e.shiftKey) && $('#msgText').val().length < 1) return false;

    if (code == 13 && !(e.shiftKey)) {
      $('.btn_send').trigger('click');
      return false;
    }
  });

  $('.btn_attach').click(function(){
    $('#fileAttachment').click();
  });

  $('#fileAttachment').on('change', function(ev){
    var fr = new FileReader();

    fr.addEventListener('loadend', function() {
      var msg = {
        data: fr.result,
        mime: ev.target.files[0].type,
        name: ev.target.files[0].name,
        size: ev.target.files[0].size
      };

      var sock_msg = {
        sender: { name: USER, id: SOCK_ID },
        msg: msg,
        type: 'file',
        timestamp: moment().valueOf()
      }

      append_link(sock_msg);

      socket.emit('sock.message', sock_msg);
    });

    fr.readAsArrayBuffer(ev.target.files[0]);
  });

  show_messages();

  $("input[type='text']").on("click", function () {
    $(this).select();
  });

  $('.btn_name').click(function() {
    USER = $('#name').val();
    $('#name').removeClass('error');

    if (verify_user()){
      join();
      $('.overlay').hide();
      $('#msgText').focus();
    }else{
      $('#name').addClass('error');
    }
  });

  $('#name').click();

  $('#name').keypress(function (e) {
    var code = (e.keyCode ? e.keyCode : e.which);

    if (code == 13) {
      $('.btn_name').trigger('click');
      return false;
    }
  });
});

function append_name(user, id) {
  is_self = (id === SOCK_ID);

  var user_li = '<li id="uid-' + id + '"' + ((is_self)? ' class="self"' : '') + '>' + user + '</li>';
  if ($('#uid-' + id).length < 1) $('.users').append(user_li);
  show_users();
}

function show_users() {
  setTimeout(function(){
    $('.users li:not(.shown)').addClass('shown');
  }, 10);
}

function show_messages() {
  setTimeout(function(){
    $('.messages .msg:not(.shown)').addClass('shown');
  }, 10);
}

function append_msg(msg, msg_in) {
  $('.messages').append(new_msg(msg, msg_in));
  $('.messages').animate({ scrollTop: 2147483647 }, 750);

  show_messages();
}

function new_msg(msg, msg_in) {
  if (typeof msg_in === 'undefined') msg_in = false;
  var name_span = ((msg_in)? '<br/><span class="user_name">' + msg.sender.name + '</span>' : '');
  return '<div class="msg ' + ((msg_in)? 'in' : 'out') + '">' + _.escape(msg.msg).replace(/(\r\n|\n)/g,'<br/>') + name_span + '</div>';
}

function append_link(msg, msg_in) {
  if (typeof msg_in === 'undefined') msg_in = false;

  var msg_obj = msg.msg;
  var arrayBuffer = msg_obj.data;
  var bytes = new Uint8Array(arrayBuffer);
  var url = 'data:' + msg_obj.mime + ';base64,' + encode(bytes);

  var name_span = ((msg_in)? '<br/><span class="user_name">' + msg.sender.name + '</span>' : '');
  var msg_link = '<div class="msg ' + ((msg_in)? 'in' : 'out') + '"><a class="download" href="' + url + '" target="_blank" download="' + msg_obj.name + '"><img src="/img/icon_download.png" alt="download"/> ' + msg_obj.name + ' (' + msg_obj.size + ' bytes)</a>' + name_span + '</div>';
  $('.messages').append(msg_link);
  $('.messages').animate({ scrollTop: 2147483647 }, 750);

  show_messages();
}

function verify_user() {
  return (/^[a-zA-Z0-9\-_=\+\.@#\$%&\*\(\)\{\}\[\]]{1,}$/g).test(USER);
}

function encode (input) {
    var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var output = '';
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;

    while (i < input.length) {
        chr1 = input[i++];
        chr2 = i < input.length ? input[i++] : Number.NaN; // Not sure if the index
        chr3 = i < input.length ? input[i++] : Number.NaN; // checks are needed here

        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;

        if (isNaN(chr2)) {
            enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
            enc4 = 64;
        }
        output += keyStr.charAt(enc1) + keyStr.charAt(enc2) +
                  keyStr.charAt(enc3) + keyStr.charAt(enc4);
    }
    return output;
}

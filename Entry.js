import React, {Component} from 'react';
import {Modal, Text, TouchableHighlight, View, Button, Alert,Picker,TextInput,StyleSheet} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { openDatabase } from 'react-native-sqlite-storage';
var db = openDatabase({ name: 'lemon_db.db', createFromLocation : 1});
export class Entry extends Component {
  //TODO: add user-friendly date and time to this state
  state = {
    statdate: new Date(),
    mode: 'date',
    show: false,
    stattype: 'Blood Glucose',
    statvalue:'',
    notes:'',
    record_id:-1,
    original_id:0,
  }
    keya = -2;
	initDate = new Date();
	visible = false;
	onDoneEditing = () =>{
	};
  
  
  setDate = (event, date) => {
    date = date || this.state.statdate;
    var put = ""
    if(this.state.mode == "date") {
		put = date.toDateString()+" "+this.state.statdate.toTimeString();
	}
	if(this.state.mode == "time") {
		put = this.state.statdate.toDateString()+" "+date.toTimeString();
	}
	date = new Date(put);
    this.initDate = date
//TODO:set user-friendly date and time in this setState()
    this.setState({
      show: Platform.OS === 'ios' ? true : false,
      statdate:date,
    });
  }
 
 
  show = mode => {
    this.setState({
      show: true,
      mode,
    });
  }

  datepicker = () => {
    this.show('date');
  }

  timepicker = () => {
    this.show('time');
  }

 didBlurSubscription = this.props.navigation.addListener(
  'willFocus',
  payload => {
    const currec = (this.props.navigation.getParam('keya', '-2'));
    this.loadData(currec);
  }
);

do_fetch = (rec_id) => {
	db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM stats WHERE id = ?',
        [rec_id],
        (tx, results) => {
          var len = results.rows.length;
          if(len == 0)
          {
			  this.setState({goods:[]});
			  Alert.alert("Record "+id+" not found");
			  return;
		  }
		   var temp = [];
			for (let i = 0; i < results.rows.length; ++i) {
			  temp.push(results.rows.item(i));
			}
		  var newnotes= '';
		  if(temp[0].notes){
			  newnotes = temp[0].notes;
		  }
		  console.log("fetched:",temp);
		  
		  this.setState({
			  notes: newnotes,
			  stattype: temp[0].statistic,
			  statvalue:temp[0].val,
			  statdate: new Date(temp[0].utc_timestamp*1000),
			  record_id:rec_id,
			  original_id:temp[0].original_id
		  });
	  }
	  );
	  });
	  
	
}

	do_replace = (oldrec,when_secs,stat_type,value,notes,original_id) => {
		var that = this;
	db.transaction(function(tx) { 
		tx.executeSql(
			'UPDATE stats SET active=\'N\' WHERE id = (?)',
			[oldrec],
			(tx,results) => {
				if(results.rowsAffected != 1) {
					console.log("Update Blew it:".results);
					Alert.alert('Whiffed on Update');
					return;
				}
			}
		); 
		//Fire two!
		tx.executeSql(
	  'INSERT INTO stats (utc_timestamp, statistic, val, notes,original_id) VALUES (?,?,?,?,?)',
	  [when_secs, stat_type, value,notes,original_id],
	  (tx, results) => {
		console.log('Results', results.rowsAffected);
		if (results.rowsAffected > 0) {
		  Alert.alert(
			'Success',
			'Updated record',
			[
			  {
				text: 'OK',
				onPress: () =>
                  that.props.navigation.goBack(),
				  //that.props.navigation.navigate('HomeScreen'),
			  },
			],
			{ cancelable: false }
		  );
		} else {
			console.log("Blew it on phase two:".results);
		  Alert.alert('Did update, bombed on insert');
		}
	  }
	);
	});
}

	do_insert = (when_secs,stat_type,value,notes) => {
		
  var that = this;
	db.transaction(function(tx) {
	tx.executeSql(
	  'INSERT INTO stats (utc_timestamp, statistic, val, notes) VALUES (?,?,?,?)',
	  [when_secs, stat_type, value,notes],
	  (tx, results) => {
		console.log('Results', results.rowsAffected);
		if (results.rowsAffected > 0) {
		  Alert.alert(
			'Success',
			'Added new record',
			[
			  {
				text: 'OK',
				onPress: () =>
                  that.props.navigation.goBack(),
				  //that.props.navigation.navigate('HomeScreen'),
			  },
			],
			{ cancelable: false }
		  );
		} else {
			console.log("Blew it:".results);
		  Alert.alert('Whiffed');
		}
	  }
	);
  });
}

saveData = () => {
	//JS Date().getTime() is in milliseconds (Un*x timestamps are in seconds) 
	//Both are based on "Jan 1, 1970, 00:00:00.000 GMT" - "start of the Un*x epoch"
	var row= "StatDate:"+this.state.statdate.getTime()+"\r\n"+"StatType:"+this.state.stattype+"\r\n";
	row+="StatValue:"+this.state.statvalue+"\r\n"+"Comments:"+this.state.notes;
	//now here, we need to yak at persistent storage
	var trunotes = null;
	if(this.state.notes != null && this.state.notes.length > 0) {
		trunotes = this.state.notes;
	}
	if(this.state.record_id <0){		
		this.do_insert(Math.floor(this.state.statdate.getTime()/1000),
			this.state.stattype,this.state.statvalue,trunotes
		);
	}
	else {
		var starting_id = this.state.original_id;
		if(starting_id < 1) {
			starting_id = this.state.record_id;
		}
		this.do_replace(this.state.record_id,Math.floor(this.state.statdate.getTime()/1000),
			this.state.stattype,this.state.statvalue,trunotes,starting_id
		);
	}
	
}

loadData = (rec) => {
	if(this.state.loaded) {
		return;
	}
	this.setState({
		loaded:true
	});
	if(rec > 0){
		this.do_fetch(rec);
	}
} 
gotVisible = () =>{
	//alert(this.props.keya);
	//we actualy fetch the record with that key value
	//and use setState() to populate
	this.initDate.setDate(this.initDate.getDate()-1);
	this.setState({
	date:this.initDate
});
}

onTypeChange = (itemValue, itemIndex) => {
    this.setState({stattype: itemValue});
}
onValChange = (text) => {
	this.setState({statvalue: text})
}

onNotesChange = (text) => {
	this.setState({notes: text})
}
  
  shouldDisable = () => {
	  if(this.state.stattype == "Food Log") {
		  return this.state.notes.length == 0;
	  }
	  else
	  {
		return (this.state.statvalue.length == 0) ;
	}
  }
  
  possibleHistoryBtn = () => {
	  if(this.state.original_id > 0) {
		  return (
	  <View style={styles.HistoryBtn}>
			<Button onPress={() => {
				Alert.alert("Forthcoming","History is forthcoming (lesser priority)");
			}} title="Edited. Click to See prior versions." />
		</View>
		);
	}
  }
  render() {
	  
    //const {navigate} = this.props.navigation;

    return (
        
          <View style={styles.EntryDlg}>
            <View>
            
			<View style = {styles.Valrow}>
			<View  >
		<Picker
		  selectedValue={this.state.stattype}
		  style={{height: 50, width: 170}}
		  onValueChange={this.onTypeChange}>
		  <Picker.Item label="Blood Glucose" value="Blood Glucose"/>
		  <Picker.Item label="Food Log" value="Food Log"/>
		  <Picker.Item label="Weight"  value="Weight"/>
		</Picker>
		</View>
		{ this.state.stattype != "Food Log" && 
			
		<View>
		<TextInput
      style={{ height: 40, borderColor: 'gray', borderWidth: 1 }}
      onChangeText={this.onValChange}
      value={this.state.statvalue}
      keyboardType="decimal-pad"
		/>
		</View>
		
			}
		</View>


        <View style = {styles.Whenbtn}>
          <Button onPress={this.datepicker} title={this.state.statdate.toDateString()} />
        </View>
         <View style = {styles.Whenbtn}>
          <Button onPress={this.timepicker} title={this.state.statdate.toTimeString()} />
        </View>
        
        { this.state.show && <DateTimePicker value={this.state.statdate}
                    mode={this.state.mode}
                    is24Hour={false}
                    display="default"
                    onChange={this.setDate} />
        }
        <View style={styles.Valrow}>
			<TextInput
				placeholder={"Notes"}
				multiline
				onChangeText={this.onNotesChange}
				value={this.state.notes}
			  />
		  </View>
        
         
			{this.possibleHistoryBtn()}
			<View style={styles.Valrow}>
             <View style={styles.Savebtn}>
              <Button onPress={() => {
					this.saveData();
                }} disabled={this.shouldDisable()} title="Save" />
               </View>
             <View style={styles.Cancelbtn}>
              <Button onPress={() => this.props.navigation.goBack()} title="Cancel" />
              </View>
			</View>
            </View>
          </View>
    );
  }
}

const styles = StyleSheet.create({
	EntryDlg: {
		flexDirection:'column',
		flex:1,
		justifyContent:'center',
		marginLeft:4,
		marginRight:4
	},
	Valrow: {
		flexDirection:'row',
		justifyContent:'center'
	},
	Whenbtn: {
		marginLeft:60,
		marginRight:60,
		marginTop:4
	},
	Savebtn: {
		marginTop:4,
		flex:1,
		marginRight:2
	},
	Cancelbtn: {
		marginTop:4,
		flex:1,
		marginLeft:2
	},
	HistoryBtn: {
	  marginTop:9,
	},
});


/*
 * Known TODOS:
 * 1. Export data to a CSV file, and add type/date searches
 * 2. Format time button (see Home.js for how to do it), then add 20 to Whenbtn margins.
 * 3. Present the history of edited entty (way low priority)
*/

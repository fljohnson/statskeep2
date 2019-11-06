import React, {Component} from 'react';
import { FlatList, StyleSheet, Text, View,TouchableOpacity,Image, TextInput, Alert,Dimensions,Button,Modal, Switch } from 'react-native';
import {Platform} from 'react-native';
import {PermissionsAndroid} from 'react-native';

import RNFetchBlob from 'rn-fetch-blob';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { openDatabase } from 'react-native-sqlite-storage';
var CorrectPath = "";
var db = openDatabase({ name: 'lemon_db.db', createFromLocation : 1});

var datatypes = [
	{
		name:"Blood Glucose",
		decimal_places:0
	},
	{
		name:"Food Log",
		decimal_places:-1
	},
	{
		name:"Weight",
		decimal_places:1
	},
];
var us; //singleton the hard way
async function diskJockeying() {
	if(Platform.OS == 'ios') {
		CorrectPath=RNFetchBlob.fs.dirs.DocumentDir;
		return; //for the moment; need to find out what user-granted permissions exist there
	}
	if(Platform.OS == 'android') {
		CorrectPath=RNFetchBlob.fs.dirs.DownloadDir;
	}
	  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Statskeep External Storage Write Permission',
        message:
          'Statskeep needs to be able to write to your Downloads folder.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('You can use the Downloads folder');
    } else {
      console.log('Downloads folder permission denied');
    }
  } catch (err) {
    console.warn(err);
  }
}

function handleActionBarBtn(posn){
	if(posn === 0){
		if(us != null) {
			us.openFilterDlg(false);
		}
	}
	if(posn === 1){
		if(us != null) {
			us.openFilterDlg(true);
		}
	}
}

export class FlatListBasics extends Component {
		
	key = -1; //this will actually come from one of the list rows
	menuIcon = Platform.OS === 'ios' ? "ios-menu":"md-menu";
	addIcon =  Platform.OS === 'ios' ? "ios-add":"md-add";
	state = {
		editing: false,
			goods: [],
			export_goods:[],
		filter: { 
			from:new Date((new Date()).toDateString()+" 00:00:00"),
			to:new Date((new Date()).toDateString()+" 23:59:59"),
			types:[],
			useFrom:false,
			useTo:false,
			useType:[true,true,true]
		},
		filterModalVisible:false,
		filterDateWhich:"",
		filterDateValue:null
		
	  };
	setEditing(visible) {
		this.setState({editing: visible});
	  }
	  onDoneEditing = () => {
		  this.setEditing(false);
	  };

  
  static navigationOptions = Platform.select({
		android: {
			
				title: 'Stats',
				headerRight: () => (
						<View style={styles.toolbar}>
						<View style={styles.tbActionWrap}>
						<TouchableOpacity onPress={() => handleActionBarBtn(0)}>
						  <Text style={styles.tbaction}>FILTER</Text>
						</TouchableOpacity>
						</View>
						
						<View style={styles.tbActionWrap}>
						<TouchableOpacity onPress={() => handleActionBarBtn(1)}>  
						  <Text style={styles.tbaction}>EXPORT</Text>
						  </TouchableOpacity>
						  </View>
						</View>
						)		
			  
		},
		ios: {
			title: 'Stats',
			headerRight: () => (
						
			<TouchableOpacity
			  activeOpacity={0.7}
			  onPress={() => this.props.navigation.push('Line', {keya: -1})}
			  style={styles.TouchableOpacityStyle}>
			  <Icon size={30} name={this.addIcon} />
			</TouchableOpacity>
			
			)
		}
	})
  
  ;
  //this makes "all" visible when this page becomes visible 
  didBlurSubscription = this.props.navigation.addListener(
  'willFocus',
  payload => {
    this.do_fetch(null,null,null);
  }
);

do_fetch = (when_start,when_end,what_type) => {
	var addlClauses=[];
	var addlParms = [];
	if(what_type != null) {
		var tipostring = what_type.join();
		addlClauses.push('statistic in ('+tipostring+')');
	}
	if(when_end != null) {
		addlClauses.push('utc_timestamp <= ?');
		addlParms.push(Math.floor(when_end.getTime()/1000));
	}
	if(when_start != null) {
		addlClauses.push('utc_timestamp >= ?');
		addlParms.push(Math.floor(when_start.getTime()/1000));
	}
	var augend = addlClauses.join(" and ");
	if(augend.length > 2){
		augend =" and "+augend;
	}
	
	db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM stats WHERE active=\'Y\''+augend+' ORDER BY utc_timestamp',
        addlParms,
        (tx, results) => {
          var len = results.rows.length;
          console.log('len',len);
          if(len == 0)
          {
			  if(this.state.forExport)
			  {
				  this.setState({export_goods:[],forExport:false});
			  }
			  else
			  {
				  this.setState({goods:[]});	
			  }
			  alert("No records found");
			  return;
		  }
		   var temp = [];
			for (let i = 0; i < results.rows.length; ++i) {
			  temp.push(results.rows.item(i));
			}
			if(this.state.forExport) {
								
			  this.setState({
				  export_goods: temp
			  });
			  //now, we need a freakin' Save Dialog
			}
			else
			{
			  this.setState({
				  goods: temp
			  });
			}
	  }
	  );
	  });
	  
	
}


constructor(props) {
	super(props);
	diskJockeying();
	us = this;
	this.state.forExport = false;
	this.state.filename ="";
  db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM stats WHERE active=\'Y\' ORDER BY utc_timestamp',
        [],
        (tx, results) => {
          var len = results.rows.length;
          console.log('len',len);
          if(len == 0)
          {
			  if(this.state.forExport)
			  {
				  this.setState({export_goods:[],forExport:false});
			  }
			  else
			  {
				  this.setState({goods:[]});	
			  }
			  alert("No records found");
			  return;
		  }
		   var temp = [];
			for (let i = 0; i < results.rows.length; ++i) {
			  temp.push(results.rows.item(i));
			}
			if(this.state.forExport) {
				
				this.state = {
					editing: false,
						export_goods: temp
					
				  };
			}
			else {
				this.state = {
					editing: false,
						goods: temp
					
				  };
			}
	  }
	  );
	  });	
}

	possibleNotesBtn = (item) => {
		if(item.notes) {
			
		return (
		<View style={styles.notesBtn}>
							<Button onPress={() => {
								Alert.alert("Notes",item.notes);
							}} title="Notes..." />
						</View>
					
		);
		}
	}
	
toggleDrawer = () => {
	if(!this.state.drawerOpen) {
		//this.refs["thedrawer"].openDrawer();
		this.setState({
			drawerOpen:true
		});
	}
	else{
		//this.refs["thedrawer"].closeDrawer();
		this.setState({
			drawerOpen:false
		});
	}
}
toggleFilterOnType = (newvalue,index) => {
	var nufilter = this.state.filter;
	nufilter.useType[index]=newvalue;
  this.setState({
	  filter:nufilter
  });
}

toggleFilterBeginDate = (newvalue) =>{
	var nufilter = this.state.filter;
	nufilter.useFrom = newvalue;
  this.setState({
	  filter:nufilter
  });
}

toggleFilterEndDate = (newvalue) =>{
	var nufilter = this.state.filter;
	nufilter.useTo = newvalue;
  this.setState({
	  filter:nufilter
  });
}


doFiltering = () => {
	console.log("Result:",this.state.filter);
	this.closeFilterDlg(true);
	var types=[];
	for(var i=0;i<datatypes.length;i++)
	{
		if(this.state.filter.useType[i]) {
			types.push("'"+datatypes[i].name+"'");
		}
	}
	if(types.length == datatypes.length || types.length == 0)
	{
		types=null;
	}
	
	var when_start = null;
	var when_end = null;
	if(this.state.filter.useFrom) {
		when_start = this.state.filter.from;
	}  
	if(this.state.filter.useTo) {
		when_end = this.state.filter.to;
	}  
	this.do_fetch(when_start,when_end,types);
}

closeFilterDlg = (goingForIt) => {
	if(goingForIt && this.state.forExport) {
		this.getExtantFiles();
	}
	this.setState({
		filterModalVisible:false,
		forExport:goingForIt && this.state.forExport
	});
}

saveCSV = () => {
	var suspect = this.state.filename.trim();
	if(!suspect.toLowerCase().endsWith(".csv")){
		suspect+=".csv";
	}
	if(this.state.extant_files.indexOf(suspect) > -1)
	{
		//TODO:find out how to place Yes and No buttons
		//Yes=save "fork"
		//No = this.closeExportDlg();
		Alert.alert("File exists",
		"There is already a file named \""+suspect+"\". Overwrite this file?",
		[
		{
      text: 'No',
      onPress: () => {},
    },
    {text: 'Yes', onPress: () => this.actualSave(suspect)},
		]
		);
	}
	else
	{	
		this.actualSave(suspect);	
	}
}
actualSave(filename) {
	console.log("save as",CorrectPath+"/"+filename);
		console.log("dosave",this.state.export_goods);
		var kiddingme="";	
		for(var i=0;i<this.state.export_goods.length;i++){
		kiddingme+=(makeCSVRow(this.state.export_goods[i])+"\r\n");
	}
		RNFetchBlob.fs.writeStream(
    CorrectPath+"/"+filename,
    // encoding, should be one of `base64`, `utf8`, `ascii`
    'utf8',
    // should data append to existing content ?
    false
)
.then(stream => Promise.all([
    stream.write('"When","What","Value","Notes"'+"\r\n"),
    stream.write(kiddingme)
    ]
))
// Use array destructuring to get the stream object from the first item of the array we get from Promise.all()
.then(([stream]) => {
	stream.close();
	this.closeExportDlg();
	})
.catch(err => {
		this.closeExportDlg();
		console.log("bombed out:",err);
	})
		
	}

closeExportDlg = () => {
	this.setState({
		export_goods:[],
		forExport:false
	});
}

getExtantFiles() {
	
	RNFetchBlob.fs.ls(CorrectPath)
    // files will an array contains filenames
    .then((files) => {
        this.setState({
			extant_files:files
		});
        
    })
    .catch((err) => {
		console.log("FAIL!",err);
	});
	

}

onFilenameChange = (text) => {
	var suspect = text.trim();
	this.setState({filename: suspect})
}

saveExportDlg() {
	//need a list of all stuff in DocumentDirectory
	return(
	<Modal
          animationType="slide"
          transparent={false}
          visible={this.state.forExport && (this.state.export_goods.length > 0)}
          >
          <Text style={styles.dlHeader}>Downloads folder</Text>
		<View style={styles.filterDlg}>
		 <View style={styles.Valrow}>
			<TextInput
				placeholder={"filename.csv"}
				onChangeText={this.onFilenameChange}
				value={this.state.filename}
			  />
		  </View>
		  <FlatList
					data={this.state.extant_files}
					keyExtractor={(item, index) => index.toString()}
					renderItem={({item,index}) => {
					
					
					return (
			   <View style={styles.filterRow}>
				<Text>{item}</Text>
				</View>
				);
					}
			  }
					/>
			
			<View style={styles.filterRow}>
             <View style={styles.Savebtn}>
              <Button onPress={() => {
					this.saveCSV();
                }} 
                disabled={this.state.filename.trim() == ""}
                title="Save" />
               </View>
             <View style={styles.Cancelbtn}>
              <Button onPress={() => this.closeExportDlg()} title="Cancel" />
              </View>
			</View>

		</View>
      </Modal>
      );
}
	
openFilterDlg = (isExporting) => {
	//this.refs["thedrawer"].closeDrawer();
	this.setState({
		drawerOpen:false,
		filterModalVisible:true,
		forExport:isExporting
	});
}

setFilterDate = (event,date) => {
	if(date == null) {
		
		this.setState({
			filterDateWhich:"",
		});
		return;
	}
	var nufilter = this.state.filter;
	if(this.state.filterDateWhich == "from"){
		nufilter.from = new Date(date.toDateString()+" 00:00:00");
	}
	if(this.state.filterDateWhich == "to"){
		nufilter.to = new Date(date.toDateString()+" 23:59:59");
	}
	this.setState({
			filterDateWhich:"",
			filter:nufilter
		});
}

editFilterDate = (which) => {
	var val = null;
	if(which == "from") {
		val = this.state.filter.from;
	}
	if(which == "to") {
		val = this.state.filter.to;
	}
	
	this.setState({
		filterDateWhich:which,
		filterDateValue:val
	});
}
datepicker = (which) => {
    this.editFilterDate(which);
  }
  
				  
		
		  
filterModalDlg() {
	return(
	<Modal
          animationType="slide"
          transparent={false}
          visible={this.state.filterModalVisible}
          >
		<View style={styles.filterDlg}>
		{ (this.state.filterDateWhich != "")  && <DateTimePicker value={this.state.filterDateValue}
                    mode={"date"}
                    display="spinner"
                    onChange={this.setFilterDate} />
        }
			<View style = {styles.filterRow}>
				<View style = {styles.Whenfirst}>
				  <Switch onValueChange={this.toggleFilterEndDate} value={this.state.filter.useTo} />
				</View>
				<View style = {styles.Whenbtn}>
				  <Text>No later than:</Text>
				</View>							
				<View style = {styles.Whenbtn}>
				  <Button onPress={()=> this.datepicker("to")} title={this.state.filter.to.toDateString()} />
				</View>
			</View>
			<View style = {styles.filterRow}>
				<View style = {styles.Whenfirst}>
				  <Switch onValueChange={this.toggleFilterBeginDate} value={this.state.filter.useFrom} />
				</View>
				<View style = {styles.Whenbtn}>
				  <Text>No earlier than:</Text>
				</View>							
				<View style = {styles.Whenbtn}>
				  <Button onPress={()=> this.datepicker("from")} title={this.state.filter.from.toDateString()} />
				</View>
			</View>
			
			<View style = {styles.filterRow}>
				<View style = {styles.Whenbtn}>
				  <Text>Types:</Text>
				</View>
				<FlatList
					data={datatypes}
					keyExtractor={(item, index) => index.toString()}
					renderItem={({item,index}) => {
					
					
					return (
			   <View style={styles.filterRow}>
			   <View style = {styles.Whenfirst}>
				  <Switch onValueChange={(newvalue) => this.toggleFilterOnType(newvalue,index)} value={this.state.filter.useType[index]} />
				</View>
				<View style = {styles.Whenbtn}>
				  <Text>{item.name}</Text>
				</View>
				</View>
				);
					}
			  }
					/>
          	
			</View>
			<View style={styles.filterRow}>
             <View style={styles.Savebtn}>
              <Button onPress={() => {
					this.doFiltering();
                }} title="Filter" />
               </View>
             <View style={styles.Cancelbtn}>
              <Button onPress={() => this.closeFilterDlg(false)} title="Cancel" />
              </View>
			</View>

		</View>
      </Modal>
      );
}
	onToolbarActionSelected = (position) => {
	  if (position === 0) { // index of 'Filter'
		this.openFilterDlg(false);
	  }
	if (position === 1) { // index of 'Export'
		this.openFilterDlg(true);
	  }  
	}

  render() {
	  
    const {navigate} = this.props.navigation;
    
    
     /*
      * 
      * 
      actions={[{title: 'Filter',  show: 'always'},{title: 'Export',  show: 'always'}]}
      onToolbarActionSelected={this.onToolbarActionSelected}
      * 
      * 
        Special thanks to Snehal Agarwal (https://aboutreact.com/react-native-floating-action-button/)
        for cutting through the online crazy-talk and no-longer-functional code regarding the Floating Action Button 
        */

    return (
      <View style={styles.container}>
      {this.filterModalDlg()}
      {this.saveExportDlg()}
      
          
        <FlatList
          data={this.state.goods}
          keyExtractor={(item, index) => item.id.toString()}
         
          renderItem={({item}) => {
			  var whatday = new Date(item.utc_timestamp*1000);
			  var value = item.val;
			  var valstyle = styles.itemValue;
			  if(item.statistic == "Food Log") {
				  value = "(see notes)";
				  valstyle = styles.seeNotes;
			  }
			  var localhrs = whatday.getHours();
			  var meridiem = " AM";
			  if(localhrs >= 12) {
				  meridiem = " PM";
			  }
			  if(localhrs > 12) {
				  localhrs = localhrs - 12;
			  }
			  var options = {
				  hour: '2-digit',
				  minute: '2-digit',
				  hour12: true
				};
				var timeString = ("0"+localhrs).substr(-2, 2)+":"+("0"+whatday.getMinutes()).substr(-2, 2)+meridiem;
			  var friendly = whatday.toLocaleDateString()+"\r\n "+timeString;
			  return (
			   <View style={styles.listItem}>
				<TouchableOpacity style={styles.sureListItems}
					onPress={() => this.props.navigation.push('Line', {keya: item.id})}
				>
					<Text style={styles.itemDate}>{friendly}</Text>
					<Text style={styles.itemType}>{item.statistic}</Text>
					<Text style={valstyle}>{value}</Text>
				</TouchableOpacity>
				{this.possibleNotesBtn(item)}
				</View>
				)
			  }
			  }
        />
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => this.props.navigation.push('Line', {keya: -1})}
          style={styles.TouchableOpacityStyle}>
          <Icon size={30} name={this.addIcon} style={styles.FloatingButtonStyle} />
        </TouchableOpacity>
        
      </View>
      
    );
  }
  
};


const styles = StyleSheet.create({
  container: {
   flex: 1,
   paddingTop: 22,
  },
  listItem: {
	textAlignVertical:'center',
    maxWidth: Dimensions.get('window').width,
    flex:1,
   flexDirection: 'row',
   justifyContent:'flex-start',
    backgroundColor: '#fff',
    marginBottom: 10,
},
sureListItems: {
	flex:1,
   flexDirection: 'row',
   justifyContent:'flex-start',
},
  itemDate: {
	textAlignVertical:'center',
    marginRight: 3,
    fontSize: 18,
    height: 54,
  },
  
  itemType: {
	textAlignVertical:'center',
    marginLeft: 5,
    marginRight: 5,
    fontSize: 18,
    height: 54,
  },
  itemValue: {
	textAlignVertical:'center',
    marginLeft: 5,
    marginRight: 5,
    fontSize: 18,
    height: 54,
  },
  seeNotes: {
	textAlignVertical:'center',
    marginLeft: 5,
    marginRight: 5,
    fontSize: 12,
    fontStyle:"italic",
    height: 54,
  },
  notesBtn: {
	  marginLeft:10,
	  marginTop:9,
},
  mubutton: {
	  width:54,
	  marginLeft:10
  }
  ,
  TouchableOpacityStyle: {
    position: 'absolute',
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    right: 30,
    bottom: 30,
  },
 
  FloatingButtonStyle: {
    width: 50,
    height: 50,
    borderRadius:25,
    paddingLeft:15,
    paddingTop:10,
    color:'white',
    backgroundColor:'#2196F3'
  },
	Whenfirst: {
		marginRight:10,
		marginTop:4
	},
	Whenbtn: {
		marginLeft:10,
		marginTop:4
	},
	filterDlg: {
		flexDirection:'column',
		flex:1,
		justifyContent:'center',
		marginLeft:4,
		marginRight:4
	},
	filterRow: {
		flexDirection:'row',
		justifyContent:'space-between'
	},
	dlHeader:{
		fontSize:20
	},
	 toolbar: {
    height: 36,
    marginRight:44,
   flexDirection: 'row',
   justifyContent:'flex-end',
   
  },
  tbActionWrap: {
	  height:36,
	  width:54,
	  paddingTop:9
  },
  tbaction:{
	textAlignVertical:'center',
	  color:"#000",
  }
}
);

function makeCSVRow(dbItem) {
	 var whatday = new Date(dbItem.utc_timestamp*1000);
			 
	  var localhrs = whatday.getHours();
	  var meridiem = " AM";
	  if(localhrs >= 12) {
		  meridiem = " PM";
	  }
	  if(localhrs > 12) {
		  localhrs = localhrs - 12;
	  }
	  var options = {
		  hour: '2-digit',
		  minute: '2-digit',
		  hour12: true
		};
		var timeString = ("0"+localhrs).substr(-2, 2)+":"+("0"+whatday.getMinutes()).substr(-2, 2)+meridiem;
	  var friendly = whatday.toLocaleDateString()+" "+timeString;
	var rv=["\""+friendly+"\""];		  
	var what = dbItem.statistic.replace('"','""');
	var val = dbItem.val;
	if(what == "Food Log") {
		val="";
	}
	var notes = "";
	if(dbItem.notes != null) {
		notes = dbItem.notes.replace('"','""');
	}
	
	rv.push("\""+what+"\"");
	rv.push("\""+val+"\"");
	rv.push("\""+notes+"\"");
	return rv.join();
}

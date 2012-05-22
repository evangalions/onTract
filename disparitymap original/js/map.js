/*
*		TO DO:
*			Cleanup function to remove polys from group
*			have data process before creating polys
			jQuery('#my-checkbox').is(':checked');
			// Check anything that is not already checked:
			jQuery(':checkbox:not(:checked)').attr('checked', 'checked');

			// Remove the checkbox
			jQuery(':checkbox:checked').removeAttr('checked');
*/

$(document).ready(function() {
	
	// PRODUCTION
	var production = false;
	
	// DATA
	var fusion_id = 2295945; //2295909; //2295346; //2291862; //2242013;
	var community_json = 'communities.json';
	
	// DENSITY MAP
	var density_map = "gfx/dot_density.png";
	var density_map_location_tl = [42.08573871051624, -87.98156261444092];
	var density_map_location_br = [41.61852234700827, -87.50129699707031];
	
	// EVALUATION STUFF
	var first_rank = true;
	var rank_multiplier = 100/77;
	
	//	MAP OBJECTS
	var map_image = new L.LayerGroup();
	var map_group = new L.LayerGroup();
	var map_fill = "#c43c35";
	var map_fill_default = "#FFF";
	//map_fill = "#c43c35";
	var map_stroke = "#999";
	var map_stroke_default = "#FFF";
	var red = "#c43c35";
	var map_stroke_width = 1;
	var map_stroke_width_default = 2;
	var map_view = [41.830033,-87.7200523];//[41.850033,-87.6500523];
	var map_zoom = 11;
	var map_zoom_max = 14;
	var map_zoom_min = 10;
	//var map_style_id = "44909";
	var map_style_id = "48820";
	var map_key = "f5d9e22a178b4b2cb7ff16422a0a7666";
	
	var map = new L.Map('map', {
	    maxZoom: map_zoom_max, 
	    minZoom: map_zoom_min,
		scrollWheelZoom:false,
		closePopupOnClick:false
	});
	
	//	ARRAYS
	var community_data = new Array();
	var communities = new Object();
	var communities_poly = new Array();
	var evaluation_array = new Array();
	var popup_array = new Array();
	var rank_array = new Array();
	
	//	MAP IMAGE BASE
	var imageBounds = new L.LatLngBounds(new L.LatLng(density_map_location_tl[0], density_map_location_tl[1]), new L.LatLng(density_map_location_br[0], density_map_location_br[1]));
	var image = new L.ImageOverlay(density_map, imageBounds);
	var reveal = false;
	
	// HOLDING OBJECTS
	var current_popup = -1;
	var default_latlng = new L.LatLng(map_view[0], map_view[1]);
	var current_latlng = default_latlng;
	var prev_latlng = default_latlng;
	var update = false;
	var popup_open = false;
	var checkbox_click = false;
	var no_eval = false;
	
	
	//	FOR DEVELOPMENT ONLY
	function trace( msg ){
		// PROBLEMS WITH IE
		if (production) {
			
		} else {
			console.log(msg);
			if( typeof( jsTrace ) != 'undefined' ){
				jsTrace.send( msg );
			}
		}
		
	}
	
	// Add Commas to numbers
	function addCommas(nStr){
		nStr += '';
		x = nStr.split('.');
		x1 = x[0];
		x2 = x.length > 1 ? '.' + x[1] : '';
		var rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	}
	
	//	Transform text to Title Case
	function toTitleCase(t) {
		t = t.replace(/_/g," ");
		t = __TitleCase.toTitleCase(t);
		//t = t.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
		return t;
	};
	
	
	// Ordinal
	function ordinal(n){
	    return ["th","st","nd","rd"][(!( ((n%10) >3) || (Math.floor(n%100/10)==1)) ) * (n%10)]; 
	}
	
	// EVEN ODD
	function isEven(x) { return (x%2)?false:true; }
	
	//	CHECKBOXES
	$('#clear-boxes').click(function(event) {
		event.preventDefault();
		trace("uncheck all");
		$(':checkbox:checked').removeAttr('checked');
		updateMap();
	});
	$('#all-boxes').click(function(event) {
		event.preventDefault();
		trace("check all");
		$(':checkbox:not(:checked)').attr('checked', 'checked');
		updateMap();
	});
	$(':checkbox').click(function() {
		checkbox_click = true;
	});
	$('.input-checkbox').click(function() {
		trace("CHECKBOX!!! DIV");
		if (checkbox_click) {
			trace("CHECKBOX!!! DIV CHECKBOX TRUE");
			//var $checkbox = $(this).find(':checkbox');
			//$checkbox.prop('checked', !$checkbox[0].checked);
		} else {
			var $checkbox = $(this).find(':checkbox');
			$checkbox.prop('checked', !$checkbox[0].checked);
		}
		update = true;
		map.closePopup();
		updateMap();
		checkbox_click = false;
	});
	$('.input-checkbox label').click(function() {
		checkbox_click = true;
	});
	//	If you want to Reveal by race as checked by default
	//$('.reveal_by_race').attr('checked', 'checked');
	//	DEFAULT CHECKED
	$('.default-check').attr('checked', 'checked');

	//	CREATE COMMUNITY POLY
	function createPoly(arr, opac, g, popup, fill, stroke_color, stroke_opacity, n) {

		var polygon = new L.Polygon(arr, {color:stroke_color, weight:map_stroke_width, opacity:stroke_opacity, fillColor:fill, fillOpacity:opac});
		if (popup.length > 0) {
			polygon.bindPopup(popup);
		}
		polygon._popup.community = n;
		g.addLayer(polygon);
		popup_array.push(polygon);
	}
	
	// CREATE MAP
	function createMap() {
		
		var cloudmadeUrl = ("http://{s}.tile.cloudmade.com/" + map_key + "/" + map_style_id + "/256/{z}/{x}/{y}.png"),
			cloudmadeAttribution = 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',
			cloudmade = new L.TileLayer(cloudmadeUrl, {maxZoom:18, attribution:cloudmadeAttribution});
			
		//	INITIAL MAP VIEW
		map.setView(new L.LatLng(map_view[0], map_view[1]), map_zoom).addLayer(cloudmade);
		
		//	CREATE IMAGE BASE
		//map_image.addLayer(image);

		// ADD GROUPS TO MAP
		map.addLayer(map_image);
		map.addLayer(map_group);
		
	}
	
	function getData() {
		
		
		
		
		function sortFusionData() {
			trace('SORT FUSION DATA');
			/*
			for(var i = 0; i < community_data.length; i++) {
				trace(community_data[i].area_numbe);
			}
			*/
			
			community_data.sort(sortByAreaNumber);
			
			/*
			for(var j = 0; j < community_data.length; j++) {
				trace(community_data[j].area_numbe);
			}
			*/
			
		}
		
		function sortJSONData() {
			
			trace('SORT FUSION DATA');
			/*
			for(var i = 0; i < communities.length; i++) {
				trace(communities[i].community.number);
			}
			*/
			
			communities.sort(sortbyCommunityNumber);
			
			/*
			for(var j = 0; j < communities.length; j++) {
				trace(communities[j].community.number);
			}
			*/
		}
		
		function sortByAreaNumber(a, b) {
			var a1= a.area_numbe, b1= b.area_numbe;
		    if(a1== b1) return 0;
		    return a1> b1? 1: -1;
		}
		
		function sortbyCommunityNumber(a, b) {
			var a1= a.community.number, b1= b.community.number;
		    if(a1== b1) return 0;
		    return a1> b1? 1: -1;
		}
		
		
		function getCommunityData() {
			
			$.getJSON(community_json, function(data) {
				trace("getCommunityData loaded");
				communities = data.communities;
				//trace(communities);
				getFusionData(fusion_id);
				//updateCommunities();
			});
			
		}
		
		function getFusionData(fid) {
			$.getJSON('http://tables.googlelabs.com/api/query?sql=SELECT * FROM ' + fid +  '&jsonCallback=?', function(data) {
				trace("getFusionData");
				for(var i = 0; i < data.table.rows.length; i++) {
					var community = new Object();
					
					for(var j = 0; j < data.table.cols.length; j++) {
						community[data.table.cols[j].toLowerCase()] = data.table.rows[i][j];
					}
					
					var cur_num = [parseFloat(community.community_area) - 1];
					communities[cur_num].community.fusion = community;
					//trace("============");
					//trace(communities[cur_num].community.fusion.name);
					//trace(communities[cur_num].community.name);
										
				}
				
				createCommunityPoly();

			});
		}
		
		
		getCommunityData();
		
		
	};
	
	function createCommunityPoly() {
		trace("createCommunityPoly");
		for(var i = 0; i < communities.length; i++) {
			var poly = new Array();
			for(var j = 0; j < communities[i].community.geometry.length; j++) {
				var p = new L.LatLng( parseFloat(communities[i].community.geometry[j].lat), parseFloat(communities[i].community.geometry[j].lon));
				poly.push(p);
			}
			
			communities_poly.push(poly);
			communities[i].community.geometry = [];
		}
		

		
		updateMap();
	}
	
	function updateCommunities(eval) {
		
		update = true;
		
		trace("UPDATE COMMUNITIES");
		
		map_group.clearLayers();
		popup_array = [];
		rank_array = [];
		var te = ""; //HTML
		
		for (var i = 0; i < communities.length; i++) {

            var master_opacity = 0;
			
			var rank_opacity = 1*master_opacity;
			var rank_total = 0;
			var rank_average = 0;
			
			
			var chart = "<div>";
			
			if (evaluation_array.length > 0) {
				no_eval = false;
				trace("NO EVALUATION");
			} else {
				no_eval = true;
			}
			
			
			
			var chart_data_set = new Array();
			var chart_label_set = new Array();
			
			for(var k = 0; k < evaluation_array.length; k++) {
				
				var _rank = parseFloat(communities[i].community.fusion[(evaluation_array[k] + "_rank")]);
				var _description = communities[i].community.fusion[(evaluation_array[k] + "_description")];
				
				if (_description == undefined) {
					_description = "";
				}
				
				//trace("DESCRIPTION " + _description)
				var _percent = parseFloat(communities[i].community.fusion[(evaluation_array[k] + "_percent")]);
				var _column = "";
				//var q = parseFloat(communities[i].community.fusion[p]);
				if (isEven(k)) {
					_column = "<div class='column-1'>";
				} else {
					_column = "<div class='column-2'>";
				}
				chart = (
					chart + (_column +
						"<div class='label-column'>" + 
						rankLabel(_rank, true) + 
						"</div>" +
						"<div class='title-column'><strong>" + 
						toTitleCase(evaluation_array[k]) + 
						"</strong>" +
						"<span class='small'>"+
						toTitleCase(_description) +
						"</span>" +
						"</div><div style='clear:both'></div>" +
						
						"<br />"
					)
				);
				
				if (_percent>0) {
					chart = (chart +
						googleChart(
							"p", evaluation_array[k], (Math.round(_percent) + "%"), _percent, "That", (100 - _percent)
						)
					);
					chart_data_set.push(Math.round(_percent));
					chart_label_set.push(toTitleCase(evaluation_array[k]));
				} else {
					chart = (
						chart + Math.round(communities[i].community.fusion[(evaluation_array[k])])
					);
					//trace("NOT A PERCENT OR NUMBER");
				}
				
				chart = chart + "</div>";
				
				rank_total = rank_total + _rank;
				
			}
			
			//chart = chart + "</div><div style='clear:both'></div>" + googleChartConcentric(chart_data_set, chart_label_set);
			chart = chart + "</div><div style='clear:both'></div>";
			
			if (rank_total > 0) {
				rank_average = (rank_total / evaluation_array.length);
			}
			
			communities[i].community.chart = chart;
			communities[i].community.rank_average = rank_average;
			communities[i].community.rank_opacity = rank_opacity*master_opacity;
			communities[i].community.rank_total = rank_total;

			
			rank_array.push(new comune(communities[i].community.rank_average, communities[i].community.name, i, i));
			
		}
		
		
		//  Custom sort funtion
		function sortByRankAverage(a, b) {
			var a1= a.rank_average, b1= b.rank_average;
		    if(a1== b1) return 0;
		    return a1> b1? 1: -1;
		}
		
		// Sort rank array using the custom sort function.
		rank_array.sort(sortByRankAverage);
		
		// Create object for array so that we can sort by current rank without disturbing the master array.
		function comune(ra, na, cn, ap) {
			this.rank_average = ra;
			this.name = na;
			this.community_number = cn;
			this.array_position = ap;
		}
		
		function createHTMLandPoly() {
			
			var _eval = true;
			var _stroke_color = map_stroke_default;
			var _stroke_opacity = 1*master_opacity;
			var _topresults = "";
			var _mapresults = "";
			
			if (evaluation_array.length > 0) {
				
			} else {
				_eval = false;
			}
			
			_mapresults = "<h3>Community Rank</h3><span class='help-block'><strong>Note:</strong> Ranked by your selected criteria, from most to least disadvantaged.</span><ul>";
			_topresults = "<h3>Most Disadvantaged</h3><span class='help-block'><strong>Note:</strong> Ranked by your selected criteria.</span><ul>";
			
			for (var l = 0; l < rank_array.length; l++) {
				var link_class = "";
				var c = "<li>";
				
				if (l < 10) {
					link_class = "scroll com_link important"
				} else {
					link_class = "scroll com_link"
				}
				
				c = c + rankLabel(l+1);

				c =  c + 
					"<a href='#map' class='" + link_class + "' title='" + 
						l + 
						"'>" +
					rank_array[l].name + 
					"</a>" + 
					"</li>";
				_mapresults = _mapresults + c;
				
				if (l < 10) {
					_topresults = _topresults + c;
				}
				
				if (_eval) {
					
					if (communities[rank_array[l].array_position].community.rank_total > 0) {
						if (reveal) {
							//_stroke_color = red;
							trace("REVEAL==========================");
							_stroke_color = "#FFF";
							map_stroke_width = 2;
							communities[rank_array[l].array_position].community.rank_opacity = ( Math.round(l * rank_multiplier) / 100 );
							//_stroke_opacity = (1 - communities[rank_array[l].array_position].community.rank_opacity);
						} else {
							_stroke_color = "#FFF";
							map_stroke_width = map_stroke_width_default;
							communities[rank_array[l].array_position].community.rank_opacity =  (Math.round(communities.length - l)*rank_multiplier) / 100;
						}

					} else {
						if (reveal) {
							_stroke_color = red;
							map_stroke_width = 2;
							communities[rank_array[l].array_position].community.rank_opacity = 0;
						}else {
							map_stroke_width = map_stroke_width_default;
							_stroke_color = "#FFF";
							communities[rank_array[l].array_position].community.rank_opacity = 0;
						}
					}
				} else {
					map_stroke_width = map_stroke_width_default;
					_stroke_color = red;
					map_stroke_width = 1;
					communities[rank_array[l].array_position].community.rank_opacity = 0;
				}
				
				
				//trace(communities[rank_array[l].array_position].community.rank_opacity);
				
				var _community_rank_label = "";
				
				if (no_eval) {
					_community_rank_label = "";
				} else {
					_community_rank_label = rankLabel((l+1), true, true)
				}
				
				var com_name = "<h3 style='display:inline'>" + communities[rank_array[l].array_position].community.name + "</h3>&nbsp;" + _community_rank_label;
				//trace("Per Capita: " + communities[rank_array[l].array_position].community.fusion.per_capita_income)
				var race_chart = "<br /><span>" + googleChartRace(
						Math.round(parseFloat(communities[rank_array[l].array_position].community.fusion.percent_white)), 
						Math.round(parseFloat(communities[rank_array[l].array_position].community.fusion.percent_black)), 
						Math.round(parseFloat(communities[rank_array[l].array_position].community.fusion.percent_asian)), 
						Math.round(parseFloat(communities[rank_array[l].array_position].community.fusion.percent_latino)), 
						Math.round(parseFloat(communities[rank_array[l].array_position].community.fusion.percent_other))
					) + "</span>";
				/*
				var total_population = "<div style='width:140px;float:left;margin-right:10px'><strong>Population</strong>"+
					rankLabel(communities[rank_array[l].array_position].community.fusion.total_population_rank, true) + 
					"<br />" + 
					addCommas(communities[rank_array[l].array_position].community.fusion.total_population) + 
					"</div>";
				var per_capita_income = "<div style='width:150px;float:left'><strong>Per Capita Income</strong>" +
					rankLabel(communities[rank_array[l].array_position].community.fusion.per_capita_income_rank, true) + 
					"<br /> $" + 
					addCommas(Math.round(parseFloat(communities[rank_array[l].array_position].community.fusion.per_capita_income))) + 
					"<span class='small'> /per person</span></div>" +
					"<div style='clear:both'></div>";
				*/
				var total_population = "<div class='column-1'><strong>Population</strong>"+
					"<br />" + 
					addCommas(communities[rank_array[l].array_position].community.fusion.total_population) + 
					"</div>";
				var per_capita_income = "<div class='column-2'><strong>Per Capita Income</strong>" +
					"<br /> $" + 
					addCommas(Math.round(parseFloat(communities[rank_array[l].array_position].community.fusion.per_capita_income))) + 
					"<span class='small'> /per person</span></div>" +
					"<div style='clear:both'></div>";
				communities[rank_array[l].array_position].community.popup = "<div class='map-popup'>"+com_name + race_chart + total_population + per_capita_income + communities[rank_array[l].array_position].community.chart + "</div>";
				
				
				createPoly(
					communities_poly[rank_array[l].array_position], 
					communities[rank_array[l].array_position].community.rank_opacity, 
					map_group, 
					communities[rank_array[l].array_position].community.popup, 
					map_fill, 
					_stroke_color, 
					_stroke_opacity,
					rank_array[l].array_position
				);
				
			}
			
			_mapresults = _mapresults + "</ul>";
			_topresults = _topresults + "</ul>";
			
			if (no_eval) {
				trace("WRITE NOTHING IN LIST");
				$('#map-results').html("");
				$('#top-results').html("");
			} else {
				$('#map-results').html(_mapresults);
				$('#top-results').html(_topresults);
			}
			
		}
		
		rank_array.sort(sortByRankAverage);
		createHTMLandPoly();
		current_latlng = map.getCenter();
		update = false;
		
		if (current_popup == -1) {
			//openCommunityPopup(0);
		} else {
			// get array number and feed array
			if (popup_open) {
				openCommunityPopupAlt(current_popup);
			}
			
		}
		
	}
	
	function openCommunityPopup(n) {
		trace("openCommunityPopup " + n);
		
		popup_array[n]._openPopup({latlng:popup_array[n].getLatLngs()[0]});
	}
	
	function openCommunityPopupAlt(n) {
		var c = 0;
		for (var l = 0; l < rank_array.length; l++) {
			if (rank_array[l].array_position == n) {
				c = l;
			}
		}
		openCommunityPopup(c);
		
	}
	
	function rankLabel(n, ord, large) {
		var label = ""
		if (n < 11) {
			if (large) {
				label = "&nbsp;<span class='label large important'>";
			} else {
				label = "&nbsp;<span class='label important'>";	
			}
		} else {
			if (large) {
				label = "&nbsp;<span class='label large grey'>";
			} else {
				label = "&nbsp;<span class='label grey'>";	
			}
		}
		//label = label + "<span class='ranktxt'>rank</span>&nbsp;" + n + "</span>&nbsp;";
		if (ord) {
			label = label + n + "<span class='ordinal'>" + ordinal(n) + "</span></span>&nbsp;";
		} else {
			label = label + n + "</span>&nbsp;";
		}
		
		return label;
	}
	
	function googleChartRace(white, black, asian, hispanic, other) {
		
		var chart = "https://chart.googleapis.com/chart?cht=p";
		chart = chart + "&chs=250x100"; // Size
		chart = chart + "&chco=E900B6|04A4E0|9BFB15|FAAF08|999999"; // Series Color
		chart = chart + "&chd=t:" + white + "," + black + "," + asian + "," + hispanic + "," + other; // chart data
		chart = chart + "&chl=white|black|asian|hispanic|other"; // Labels SIDE
		chart = "<img src='" + chart + "' width='250px' height='100px'/>";
		return chart;
		
		
		// http://chart.apis.google.com/chart?chs=200x100&cht=p&chco=E900B6|04A4E0|9BFB15|FAAF08|999999&chd=s:GGGGl&chdl=white|black|asian|hispanic|other
	}
	
	function googleChart(type, c1, t1, v1, t2, v2, race) {
		
		var chart = "https://chart.googleapis.com/chart?cht=" + type;
		chart = chart + "&chs=125x60"; // Size
		chart = chart + "&chco=c43c35,CCCCCC"; // Series Color
		chart = chart + "&chd=t:" + v1 + "," + v2; // chart data
		chart = chart + "&chdl=" + t1;// + "|" + t2; // Labels SIDE
		//chart = chart + "&chl=" + t1;// + "|" + t2; // Labels SIDE
		chart = "<img src='" + chart + "' width='125px' height='60px'/>";
		return chart;

	};
	
	function googleChartConcentric(data_set, label_set) {
		//https://chart.googleapis.com/chart?cht=v&chs=200x100&chd=t:100,20,20,20,20,0,0&chdl=First%7CSecond%7CThird&chco=ff0000,00ff00,0000ff
		//https://chart.googleapis.com/chart?cht=pc&chs=150x150&chd=t:33,66|25,75|60,40
		//https://chart.googleapis.com/chart?cht=pc&chs=125x60&chco=c43c35,CCCCCC&chd=t:&chdl=43.2643665094071,56.7356334905929%7C60.4946996466431,39.5053003533569
		var chart = "https://chart.googleapis.com/chart?cht=pc";
		chart = chart + "&chs=250x150"; // Size
		chart = chart + "&chco="; // Series Color
		//chart = chart + "&chco=c43c35|CCCCCC"; // Series Color
		
		for (var j = 0; j < data_set.length; j++) {
			if (j==0) {
				chart = chart + "c43c35|CCCCCC";	
			} else {
				chart = chart + ",c43c35|CCCCCC";	
			}
		}
		
		chart = chart + "&chd=t:" //chart data
		for (var l = 0; l < data_set.length; l++) {
			if (l==0) {
				
			} else {
				chart = chart + "|";
			}
			chart = chart + data_set[l] + "," + (100 - data_set[l]);
		}
		
		//chart = chart + "&chdl=" // Labels SIDE
		chart = chart + "&chl=" // Labels arm
		
		for (var i = 0; i < label_set.length; i++) {
			if (i==0) {
				
			} else {
				chart = chart + "|";
			}
			chart = chart + label_set[i] + "|";
		}
		
		//chart = chart + "&chd=t:" + v1 + "," + v2; // chart data
		//chart = chart + "&chdl=" + t1;// + "|" + t2; // Labels SIDE

		chart = "<img src='" + chart + "' width='250px' height='150px'/>";
		return chart;
	}
	
	function googleChartVenn(data_set, label_set) {
		//https://chart.googleapis.com/chart?cht=v&chs=200x100&chd=t:100,20,20,20,20,0,0&chdl=First%7CSecond%7CThird&chco=ff0000,00ff00,0000ff
		//https://chart.googleapis.com/chart?cht=pc&chs=150x150&chd=t:33,66|25,75|60,40
		//https://chart.googleapis.com/chart?cht=pc&chs=125x60&chco=c43c35,CCCCCC&chd=t:&chdl=43.2643665094071,56.7356334905929%7C60.4946996466431,39.5053003533569
		var chart = "https://chart.googleapis.com/chart?cht=v";
		chart = chart + "&chs=250x200"; // Size
		//chart = chart + "&chco="; // Series Color
		//chart = chart + "&chco=c43c35|CCCCCC"; // Series Color
		/*
		for (var j = 0; j < data_set.length; j++) {
			if (j==0) {
				chart = chart + "c43c35|CCCCCC";	
			} else {
				chart = chart + ",c43c35|CCCCCC";	
			}
		}
		*/
		chart = chart + "&chd=t:100" //chart data
		for (var l = 0; l < data_set.length; l++) {
			if (l==0) {
				chart = chart + ",";
			} else {
				chart = chart + ",";
			}
			chart = chart + data_set[l];
		}
		/*
		//chart = chart + "&chdl=" // Labels SIDE
		chart = chart + "&chl=Total" // Labels arm
		
		for (var i = 0; i < label_set.length; i++) {
			if (i==0) {
				
			} else {
				chart = chart + "|";
			}
			chart = chart + label_set[i];
		}
		*/
		//chart = chart + "&chd=t:" + v1 + "," + v2; // chart data
		//chart = chart + "&chdl=" + t1;// + "|" + t2; // Labels SIDE

		chart = "<img src='" + chart + "' width='250px' height='200px'/>";
		return chart;
	}
	
	function updateMap() {

		trace("UPDATE MAP");
		
		evaluation_array = [];
		
		$(':checkbox:not(:checked)').parent().parent().removeClass('active');
		
		$(':input:not(:checked)').each(function(i,v){
			if ($(this).attr("value") == "reveal_by_race") {
				trace("reveal_by_race");
				map_fill = "#c43c35";
				if (reveal) {
					reveal = false;
				}
			}
		});
		
		$("input[type='checkbox']:checked").each(function(i,v) {
			
			if ($(this).parent().parent().hasClass('active')) {
			} else {
				$(this).parent().parent().addClass('active');
			}
			
			if ($(this).attr("value") == "reveal_by_race") {
				trace("reveal_by_race");
				map_fill = map_fill_default;
				if (reveal) {
					
				} else {
					reveal = true;
				}
			} else {
				evaluation_array.push($(this).attr("value"));
			}
		});
		
		updateCommunities();
		
	}
	
	map.on('popupremoved', function(e) {
		trace(e.target);
		current_popup = e.target._popup.community;
		trace("CURRENT POPUP " + current_popup);
	    trace("CLOSE EVENT");
		
		if (update) {
			
		} else {
			popup_open = false;
		}
		
		if (Math.round(default_latlng.lat * 10) == Math.round(map.getCenter().lat * 10) && Math.round(default_latlng.lng * 10) == Math.round(map.getCenter().lng * 10) ){
			trace("already centered");
			map.panBy(new L.Point(1,1));
		} else {
			trace("move it")
			trace(default_latlng.lat + " " + map.getCenter().lat)
			//map.panTo(current_latlng);
			trace("ZOOM " + map.getZoom());
			if (map.getZoom() == 10 || map.getZoom() == 11) {
				map.panTo(default_latlng);
			} else {
				map.panBy(new L.Point(1,1));
			}
			
		}
		

	});
	// LINKS etc
	// Community links
	$(".com_link").live("click", function(event) {
		event.preventDefault();
		$('html,body').animate({scrollTop:$(this.hash).offset().top}, 700);
		var n = $(this).attr("title");
		
		openCommunityPopup(n);
	});
	
	map.on('layeradd', function(e) {
		if (update) {
			
		} else {
			popup_open = true;
			trace("LAYER ADDED");
			prev_latlng = current_latlng;
			current_latlng = map.getCenter();
		}
		
		
	});

	//openPopup

	
	createMap();
	getData();
	
	
	
});

var __TitleCase = {
    __smallWords: ['a', 'an', 'and', 'as', 'at', 'but',
        'by', 'en', 'for', 'if', 'in', 'of', 'on', 'or',
        'the', 'to', 'v[.]?', 'via', 'vs[.]?'],

    init: function() {
        this.__smallRE = this.__smallWords.join('|');
        this.__lowerCaseWordsRE = new RegExp(
            '\\b(' + this.__smallRE + ')\\b', 'gi');
        this.__firstWordRE = new RegExp(
            '^([^a-zA-Z0-9 \\r\\n\\t]*)(' + this.__smallRE + ')\\b', 'gi');
        this.__lastWordRE = new RegExp(
            '\\b(' + this.__smallRE + ')([^a-zA-Z0-9 \\r\\n\\t]*)$', 'gi');
    },

    toTitleCase: function(string) {
        var line = '';

        var split = string.split(/([:.;?!][ ]|(?:[ ]|^)["“])/);

        for (var i = 0; i < split.length; ++i) {
            var s = split[i];

            s = s.replace(
                /\b([a-zA-Z][a-z.'’]*)\b/g,
                this.__titleCaseDottedWordReplacer);

            // lowercase the list of small words
            s = s.replace(this.__lowerCaseWordsRE, this.__lowerReplacer);

            // if the first word in the title is a small word then capitalize it
            s = s.replace(this.__firstWordRE, this.__firstToUpperCase);

            // if the last word in the title is a small word, then capitalize it
            s = s.replace(this.__lastWordRE, this.__firstToUpperCase);

            line += s;
        }

        // special cases
        line = line.replace(/ V(s?)\. /g, ' v$1. ');
        line = line.replace(/(['’])S\b/g, '$1s');
        line = line.replace(/\b(AT&T|Q&A)\b/ig, this.__upperReplacer);

        return line;
    },
     
    __titleCaseDottedWordReplacer: function (w) {
        return (w.match(/[a-zA-Z][.][a-zA-Z]/)) ? w : __TitleCase.__firstToUpperCase(w);
    },

	__lowerReplacer: function (w) { return w.toLowerCase() },

    __upperReplacer: function (w) { return w.toUpperCase() },

    __firstToUpperCase: function (w) {
        var split = w.split(/(^[^a-zA-Z0-9]*[a-zA-Z0-9])(.*)$/);
        split[1] = split[1].toUpperCase();
        return split.join('');
    },

    test: function() {
        var testStrings = [
            "Q&A With Steve Jobs: 'That's What Happens In Technology'",
            "What Is AT&T's Problem?",
            "Apple Deal With AT&T Falls Through",
            "this v that",
            "this vs that",
            "this v. that",
            "this vs. that",
            "The SEC's Apple Probe: What You Need to Know",
            "'by the Way, small word at the start but within quotes.'",
            "Small word at end is nothing to be afraid of",
            "Starting Sub-Phrase With a Small Word: a Trick, Perhaps?",
            "Sub-Phrase With a Small Word in Quotes: 'a Trick, Perhaps?'",
            'Sub-Phrase With a Small Word in Quotes: "a Trick, Perhaps?"',
            '"Nothing to Be Afraid of?"',
            '"Nothing to Be Afraid Of?"',
            'a thing'];


        var validStrings = [
            "Q&A With Steve Jobs: 'That's What Happens in Technology'",
            "What Is AT&T's Problem?",
            "Apple Deal With AT&T Falls Through",
            "This v That",
            "This vs That",
            "This v. That",
            "This vs. That",
            "The SEC's Apple Probe: What You Need to Know",
            "'By the Way, Small Word at the Start but Within Quotes.'",
            "Small Word at End Is Nothing to Be Afraid Of",
            "Starting Sub-Phrase With a Small Word: A Trick, Perhaps?",
            "Sub-Phrase With a Small Word in Quotes: 'A Trick, Perhaps?'",
            'Sub-Phrase With a Small Word in Quotes: "A Trick, Perhaps?"',
            '"Nothing to Be Afraid Of?"',
            '"Nothing to Be Afraid Of?"',
            'A Thing'];

        for (var i = 0; i < testStrings.length ; ++i)
        {
            var s = testStrings[i].toTitleCase();
            if (s != validStrings[i])
            {
                alert(s + '\ndoes not match\n' + validStrings[i]);
                return false;
                break;
            }
        }    
        return true;
    }
};

__TitleCase.init();

//function toTitleCase(string) { return __TitleCase.toTitleCase(string); }

String.prototype.toTitleCase = function() { return toTitleCase(this); }




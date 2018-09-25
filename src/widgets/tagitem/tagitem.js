/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */


import {inject} from 'aurelia-dependency-injection';
import {Annotation} from 'Annotation';
import {UserServices} from 'UserServices';
import {RecordServices} from 'RecordServices';
import {CampaignServices} from 'CampaignServices.js';
import {AnnotationServices} from 'AnnotationServices.js';
import {ThesaurusServices} from 'ThesaurusServices.js';
import {bindable} from 'aurelia-framework';
import {EventAggregator} from 'aurelia-event-aggregator';

@inject(UserServices, RecordServices, CampaignServices, EventAggregator, AnnotationServices, ThesaurusServices, 'loginPopup')
export class Tagitem {

  @bindable prefix = '';

  constructor(userServices, recordServices, campaignServices, eventAggregator, annotationServices, thesaurusServices, loginPopup) {
		this.colorSet = [
			["/img/color/img-black.png", "Black"],
			["/img/color/img-gray.png", "Grey"],
			["/img/color/img-metallic.png", "Metallic"],
			["/img/color/img-silver.png", "Silver"],
			["/img/color/img-bronze.png", "Bronze"],
			["/img/color/img-brown.png", "Brown"],
			["/img/color/img-copper.png", "Copper"],
			["/img/color/img-red.png", "Red"],
			["/img/color/img-orange.png", "Orange"],
			["/img/color/img-beige.png", "Beige"],
			["/img/color/img-gold.png", "Gold"],
			["/img/color/img-yellow.png", "Yellow"],
			["/img/color/img-green.png", "Green"],
			["/img/color/img-blue.png", "Blue"],
			["/img/color/img-purple.png", "Purple"],
			["/img/color/img-pink.png", "Pink"],
			["/img/color/img-multicolored.png", "Multicoloured", "big"],
			["/img/color/img-white.png", "White"],
			["/img/color/img-transparant.png", "Transparent"]
		];
		this.ea = eventAggregator;
    this.userServices = userServices;
    this.recordServices = recordServices;
    this.campaignServices = campaignServices;
    this.annotationServices = annotationServices;
    this.thesaurusServices = thesaurusServices;
    this.placeholderText = "Start typing a term then select from the options";
    this.annotations = [];
    this.suggestedAnnotation = {};
    this.suggestionsLoading = false;
    this.suggestedAnnotations =  [];
	this.selectedAnnotation = null;
	this.lg=loginPopup;

	this.evsubscr1 = this.ea.subscribe('annotations-created', () => { this.reloadAnnotations()});
	this.handleBodyClick = e => {
        console.log(e.target.id);
        if(e.target.id!="annotationInput"){
        	this.suggestedAnnotations =  [];
        	 this.suggestionsLoading = false;
        }
    };

  }



  attached() {
      document.addEventListener('click', this.handleBodyClick);
  }

  detached() {
	  this.evsubscr1.dispose();
      document.removeEventListener('click', this.handleBodyClick);
  }

  async activate(params) {
    this.campaign = params.campaign;
    this.recId = params.recId;
    this.annotations.splice(0, this.annotations.length);
    if (this.userServices.isAuthenticated() && this.userServices.current === null) {
      await this.userServices.reloadCurrentUser();
      await this.getRecordAnnotations(this.recId);
    } else {
      await this.getRecordAnnotations(this.recId);
    }
  }

  async reloadAnnotations() {
    this.annotations = [];
    await this.getRecordAnnotations(this.recId);
  }

  prefixChanged() {
    //	console.log(this.selectedAnnotation+' '+this.selectedAnnotation.vocabulary+' '+this.selectedAnnotation.label);
    if (this.prefix === '' || this.selectedAnnotation != null) {
      this.suggestedAnnotations = [];
      return;
    }
    this.selectedAnnotation = null;
    this.getSuggestedAnnotations(this.prefix);
  }

  async getSuggestedAnnotations(prefix) {
    this.lastRequest = prefix;
    this.suggestionsLoading = true;
    this.suggestedAnnotations = this.suggestedAnnotations.slice(0, this.suggestedAnnotations.length);
    this.selectedAnnotation = null;
    let self = this;
    await this.thesaurusServices.getCampaignSuggestions(prefix, this.campaign.dbId).then((res) => {
      if (res.request === self.lastRequest) {
        //this.suggestedAnnotations = res.results.slice(0, 20);
        self.suggestedAnnotations = res.results;
        if (self.suggestedAnnotations.length > 0 && self.suggestedAnnotations[0].exact) {
          self.selectedAnnotation = self.suggestedAnnotations[0];
        }
        self.suggestionsLoading = false;
      }
    });
  }

  selectSuggestedAnnotation(index) {
    if (this.userServices.isAuthenticated() == false) {
      this.lg.call();
    } else {
      this.selectedAnnotation = this.suggestedAnnotations.find(obj => {
        return obj.id === index
      });
      let lb = this.selectedAnnotation.label;
      let existscheck = this.annotations.find(obj => {
        return obj.label === lb
      });
      if (existscheck != null) {
        this.prefix = "";
        this.selectedAnnotation = null;
        this.suggestedAnnotations = [];
        toastr.error('Tag already exists');
        return;
      }
      this.suggestedAnnotations = [];
      this.errors = this.selectedAnnotation == null;
      if (!this.errors) {
        let self = this;
        this.annotationServices.annotateRecord(this.recId, this.selectedAnnotation,this.campaign.username).then(() => {
          toastr.success('Annotation added.');
          self.ea.publish('annotations-created', self.record);
          this.prefix = "";
          this.selectedAnnotation = null;
        }).catch((error) => {
          toastr.error('An error has occured');
        });
      }
    }
  }

  get suggestionsActive() {
    return this.suggestedAnnotations.length !== 0;
  }

  async annotate(label) {
    if (this.userServices.isAuthenticated() == false) {
      this.lg.call();
      return;
    }
    if (!this.hasContributed()) {
      this.campaignServices.incUserPoints(this.campaign.dbId, this.userServices.current.dbId, 'records');
    }
    var answer = this.annotationExists(label);
    if (!answer) {
      if (this.userServices.isAuthenticated() && this.userServices.current === null) {
        await this.userServices.reloadCurrentUser();
      }
      await this.thesaurusServices.getSuggestions(label, ["fashion"]).then(res => {
        this.suggestedAnnotation = res.results[0];
      });
      await this.annotationServices.annotateRecord(this.recId, this.suggestedAnnotation, this.campaign.username);
      this.campaignServices.incUserPoints(this.campaign.dbId, this.userServices.current.dbId, 'created');
      // Clear and reload the annotations array
      this.annotations.splice(0, this.annotations.length);
      await this.getRecordAnnotations(this.recId);
    } else if (!this.annotations[answer.index].approvedByMe) {
      this.score(answer.id, 'approved', answer.index);
    }
  }

  deleteAnnotation(id, index) {
    if (this.userServices.isAuthenticated() == false) {
      this.lg.call();
      return;
    }
    this.annotationServices.delete(id).then(() => {
      this.annotations.splice(index, 1);
      this.campaignServices.decUserPoints(this.campaign.dbId, this.userServices.current.dbId, 'created');
      if (!this.hasContributed()) {
        this.campaignServices.decUserPoints(this.campaign.dbId, this.userServices.current.dbId, 'records');
      }
    }).catch(error => {
      console.log(error.message);
    });
  }

  async validate(annoId, annoType, index, approvedByMe, rejectedByMe) {
    if (this.userServices.isAuthenticated() == false) {
      this.lg.call();
      return;
    }
    if (((annoType == 'approved') && approvedByMe) || ((annoType == 'rejected') && rejectedByMe))
      this.unscore(annoId, annoType, index);
    else
      this.score(annoId, annoType, index);
    }

  async score(annoId, annoType, index) {
    if (!this.hasContributed()) {
      this.campaignServices.incUserPoints(this.campaign.dbId, this.userServices.current.dbId, 'records');
    }
    if (annoType == 'approved') {
      //this.annotationServices.approve(annoId);
      this.annotationServices.approveObj(annoId, this.campaign.username).then(response => {
        response['withCreator'] = this.userServices.current.dbId;
        this.annotations[index].approvedBy.push(response);
      }).catch(error => {
        console.log(error.message);
      });
      this.annotations[index].approvedByMe = true;
      if (this.annotations[index].rejectedByMe) {
        var i = this.annotations[index].rejectedBy.map(function(e) {
          return e.withCreator;
        }).indexOf(this.userServices.current.dbId);
        if (i > -1) {
          this.annotations[index].rejectedBy.splice(i, 1);
        }
        this.annotations[index].rejectedByMe = false;
      } else {
        if ((!this.userServices.isAuthenticated()) || (this.userServices.isAuthenticated() && this.userServices.current === null)) {
          await this.userServices.reloadCurrentUser();
          this.campaignServices.incUserPoints(this.campaign.dbId, this.userServices.current.dbId, annoType);
        } else {
          this.campaignServices.incUserPoints(this.campaign.dbId, this.userServices.current.dbId, annoType);
        }
      }
    }

    if (annoType == 'rejected') {
      //this.annotationServices.reject(annoId);
      this.annotationServices.rejectObj(annoId, this.campaign.username).then(response => {
        response['withCreator'] = this.userServices.current.dbId;
        this.annotations[index].rejectedBy.push(response);
      }).catch(error => {
        console.log(error.message);
      });
      this.annotations[index].rejectedByMe = true;
      if (this.annotations[index].approvedByMe) {
        var i = this.annotations[index].approvedBy.map(function(e) {
          return e.withCreator;
        }).indexOf(this.userServices.current.dbId);
        if (i > -1) {
          this.annotations[index].approvedBy.splice(i, 1);
        }
        this.annotations[index].approvedByMe = false;
      } else {
        if ((!this.userServices.isAuthenticated()) || (this.userServices.isAuthenticated() && this.userServices.current === null)) {
          await this.userServices.reloadCurrentUser();
          this.campaignServices.incUserPoints(this.campaign.dbId, this.userServices.current.dbId, annoType);
        } else {
          this.campaignServices.incUserPoints(this.campaign.dbId, this.userServices.current.dbId, annoType);
        }
      }
    }
  }

  async unscore(annoId, annoType, index) {
    if (annoType == 'approved') {
      //this.annotationServices.unscore(annoId);
      this.annotationServices.unscoreObj(annoId).catch(error => {
        console.log(error.message);
      });
      var i = this.annotations[index].approvedBy.map(function(e) {
        return e.withCreator;
      }).indexOf(this.userServices.current.dbId);
      if (i > -1) {
        this.annotations[index].approvedBy.splice(i, 1);
      }
      this.annotations[index].approvedByMe = false;
      if ((!this.userServices.isAuthenticated()) || (this.userServices.isAuthenticated() && this.userServices.current === null)) {
        await this.userServices.reloadCurrentUser();
        this.campaignServices.decUserPoints(this.campaign.dbId, this.userServices.current.dbId, annoType);
      } else {
        this.campaignServices.decUserPoints(this.campaign.dbId, this.userServices.current.dbId, annoType);
      }
    }

    if (annoType == 'rejected') {
      //this.annotationServices.unscore(annoId);
      this.annotationServices.unscoreObj(annoId).catch(error => {
        console.log(error.message);
      });
      var i = this.annotations[index].rejectedBy.map(function(e) {
        return e.withCreator;
      }).indexOf(this.userServices.current.dbId);
      if (i > -1) {
        this.annotations[index].rejectedBy.splice(i, 1);
      }
      this.annotations[index].rejectedByMe = false;
      if ((!this.userServices.isAuthenticated()) || (this.userServices.isAuthenticated() && this.userServices.current === null)) {
        await this.userServices.reloadCurrentUser();
        this.campaignServices.decUserPoints(this.campaign.dbId, this.userServices.current.dbId, annoType);
      } else {
        this.campaignServices.decUserPoints(this.campaign.dbId, this.userServices.current.dbId, annoType);
      }
    }
    if (!this.hasContributed()) {
      this.campaignServices.decUserPoints(this.campaign.dbId, this.userServices.current.dbId, 'records');
    }
  }

  async getRecordAnnotations(id) {
    await this.recordServices.getAnnotations(this.recId, "Tagging").then(response => {
      for (var i = 0; i < response.length; i++) {
        if (!this.userServices.current) {
          this.annotations.push(new Annotation(response[i], ""));
        } else {
          this.annotations.push(new Annotation(response[i], this.userServices.current.dbId));
        }
      }
    });
    // Sort the annotations in descending
    // order based on their score
    this.annotations.sort(function(a, b) {
      return b.score - a.score;
    });
  }

  getColor(label) {
    var index = this.colorSet.findIndex(element => {
      return element[1] == label;
    });
    if (index == -1) {
      return '/img/assets/images/no_image.jpg';
    } else {
      return this.colorSet[index][0];
    }
  }

  annotationExists(label) {
    for (var i in this.annotations) {
      if (this.annotations[i].label == label) {
        return {'id': this.annotations[i].dbId, 'index': i};
      }
    }
    return null;
  }

  hasContributed() {
    for (var i in this.annotations) {
      if (this.annotations[i].createdByMe || this.annotations[i].approvedByMe || this.annotations[i].rejectedByMe) {
        return true;
      }
    }
    return false;
  }

}

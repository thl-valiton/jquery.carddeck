/*

  jQuery CardDeck-Plugin - 1.0.0
  Author: Thomas Limp (thomas.limp@valiton.com)
  Licence: MIT

 Copyright (c) 2012 Thomas Limp (thomas.limp@valiton.com),
                    Valiton GmbH (http://www.valiton.com)

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software
 is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 IN THE SOFTWARE.

*/


/*jshint browser: true,
    strict: false,
    laxbreak: true,
    laxcomma: true
*/

(function ($, window, document, undefined) {

    var defaults = {
        itemsVisible: 8,
        scale: 0.95,
        scaleX: false,
        opacityMin: 0.25,
        opacityMax: 1.0,
        zStep: 10,
        zMin: 100,
        speed: 500,
        throttle: 0.5,
        spread: false,
        easing: 'swing',
        easingLast: null,
        enableSelection: false
    };

    var CardDeck = function (elem, options) {
        var self = this;
        this.FORWARD = -1;
        this.BACKWARD = 1;
        this.NOWARD = 0;
        this.options = $.extend({}, defaults, options);
        this.$deck = $(elem);
        this.$cards = this.$deck.children();

        var opacityFor = function (index) {
            var opacity = 0;
            if (index < self.options.itemsVisible || self.lessItemsThanVisible) {
                opacity = self.options.opacityMax - (index * self.options.opacityStep);
            }
            return opacity;
        };

        var scaleFor = function (index) {
            return Math.pow(self.options.scale, index);
        };

        var xFor = function (index) {
            var x = self.xMax - index * self.xStep;
            if (self.options.scaleX) {
                x = scaleFor(index) * x;
            }
            return x;
        };

        var yFor = function (index) {
            return 0.5 * self.cardHeight * (1 - scaleFor(index));
        };

        var zFor = function (index) {
            var z = self.options.zMin - self.options.zStep;
            if (index === self.indexMax && !self.lessItemsThanVisible) {
                z = self.options.zMin + self.options.zStep * (self.options.itemsVisible + 1);
            } else
            if (index < self.options.itemsVisible) {
                z = self.options.zMin + self.options.zStep * (self.options.itemsVisible - index);
            }
            return  z;
        };

        var propertiesFor = function (index) {
            var scale = scaleFor(index);
            return {
                opacity: opacityFor(index),
                width: (scale * self.cardWidth).toFixed(0) + 'px',
                height: (scale * self.cardHeight).toFixed(0) + 'px',
                left: (xFor(index)).toFixed(0) + 'px',
                top: (yFor(index)).toFixed(0) + 'px',
                zIndex: zFor(index),
                fontSize: (scale * self.cardFontSize).toFixed(0) + 'px'
            };
        };

        var cssOrAnimate = function (operation, $card, steps) {
            steps = steps || 1;

            var speed = self.options.speed * (1 - (self.options.throttle * steps / self.stepsMax))
                , propertiesLeft = '0px'
                , index = $card.data('carddeck-card')
                , indexCompare = self.FORWARD === self.direction ? 0 : self.indexMax
                , indexNew = self.FORWARD === self.direction ? self.indexMax : 0
                , $transparencyOn = self.options.transparencyOn ? $(self.options.transparencyOn, $card) : $card
                , easing = self.options.easing
                , properties
                , opacity
                , callback = function () {}
                , currentCallback = callback
                , postPositionCallback = function () {
                        var currentLeft = $card.css('left');
                        if (parseInt(currentLeft, 10) === self.width) {
                            $card.css({left: propertiesLeft});
                        }
                    }
                , defaultCallback = function () {
                        currentCallback();
                        $card.data('carddeck-card', index);
                        if (index === 0) {
                            self.running = false;
                        }
                        $card.trigger('carddeckStopped');
                    }
                , i;

            for (i = 0; i < steps; i++) {

                if (self.direction) {
                    if (indexCompare === index) {
                        index = indexNew;
                    } else {
                        index = index + self.direction;
                    }
                }

                // Only animate/style items when no movement or item becomes visible after all steps
                if (self.NOWARD !== self.direction && index < self.indexMax && index > self.options.itemsVisible + steps - 1) {
                    $card.data('carddeck-card', index);
                } else {
                    if (index >= self.options.itemsVisible) {
                        properties = propertiesFor(self.options.itemsVisible);
                    } else {
                        properties = propertiesFor(index);
                    }

                    opacity = properties.opacity;

                    if (index === 0 && self.BACKWARD === self.direction) {
                        $card.css({left: self.width, zIndex: properties.zIndex + 1});
                    }

                    if (index === self.indexMax && self.FORWARD === self.direction) {
                        propertiesLeft = properties.left;
                        properties.left = self.width;
                        if (i === steps - 1 || self.lessItemsThanVisible) {
                            callback = postPositionCallback;
                        }
                    }

                    if (i === steps - 1) {
                        currentCallback = callback;
                        if (self.options.easingLast) {
                            easing = self.options.easingLast;
                        }
                        callback = defaultCallback;
                    }


                    if ($transparencyOn === $card) {
                        $card[operation](properties, speed, easing, callback);
                    } else {
                        delete properties.opacity;
                        if (self.options.transparencyOn && self.options.transparencyBlock) {
                            var $transparencyBlock = self.options.transparencyBlock ? $(self.options.transparencyBlock, $card) : $card;
                            if (index >= self.options.itemsVisible) {
                                $transparencyBlock[operation]({backgroundColor: self.transparencyBlockBackground.alpha(0)}, speed, easing);
                            }
                            if (index < self.options.itemsVisible) {
                                $transparencyBlock[operation]({backgroundColor: self.transparencyBlockBackground}, speed, easing);
                            }
                        }
                        $card[operation](properties, speed, easing, callback);
                        $transparencyOn[operation]({opacity: opacity}, speed, easing);
                    }
                }
                if ('css' === operation) {
                    $card.trigger('carddeckStopped');
                }
            }
        };

        var animate = function (steps) {
            if (!self.running) {
                self.running = true;
                self
                    .$cards
                        .each(function () {
                            var $card = $(this);
                            cssOrAnimate('animate', $card, steps);
                        });
            }
        };

        var init = function () {
            self.length = self.$cards.length;
            self.indexMax = self.length - 1;
            self.stepsMax = self.options.itemsVisible - 1;
            self.width = parseInt(self.$deck.width(), 10);
            self.cardWidth = parseInt(self.$cards.width(), 10);
            self.cardHeight = parseInt(self.$cards.height(), 10);
            self.height = self.cardHeight;
            self.baseFontSize = parseInt(self.$deck.css('fontSize'), 10);
            self.cardFontSize = parseInt(self.$cards.css('fontSize'), 10);

            self.direction = self.NOWARD;
            self.running = false;

            self.lessItemsThanVisible = self.indexMax <= self.options.itemsVisible;

            if (self.lessItemsThanVisible) {
                self.options.opacityStep = (self.options.opacityMax - self.options.opacityMin) / (self.indexMax + 1);
                if (self.options.spread) {
                    self.options.itemsVisible = self.$cards.length;
                }
            } else {
                self.options.opacityStep = (self.options.opacityMax - self.options.opacityMin) / self.options.itemsVisible;
            }

            if (self.options.transparencyOn) {
                var $transparencyBlock = self.options.transparencyBlock ? $(self.options.transparencyBlock, self.$cards) : self.$cards;
                self.transparencyBlockBackground = $.Color($transparencyBlock, 'backgroundColor');
            }

            self.xMax = self.width - self.cardWidth;
            self.xStep = self.xMax / (self.options.itemsVisible - 1);

            if (!self.options.enableSelection) {
                self
                    .$deck
                        .attr('unselectable', 'on')
                        .css({'-moz-user-select':'none',
                            '-o-user-select':'none',
                            '-khtml-user-select':'none',
                            '-webkit-user-select':'none',
                            '-ms-user-select':'none',
                            'user-select':'none'})
                        .each(function() {
                            $(this).attr('unselectable','on')
                            .bind('selectstart',function(){ return false; });
                        });
            }

            self
                .$deck
                    .css({
                        position: 'relative',
                        width: self.width + 'px',
                        height: self.height + 'px',
                        overflow: 'hidden'});

            self
                .$cards
                    .css({position: 'absolute'})
                    .each(function (index) {
                        $(this).data('carddeck-card', index);
                        cssOrAnimate('css', $(this));
                    })
                    .on('click.carddeck', function (event) {
                        var index = $(this).data('carddeck-card');
                        if (0 < index) {
                            event.preventDefault();
                            self.animateForward(index);
                        }
                    });

            if (self.options.btnForward) {
                $(self.options.btnForward).on('click', function (event) {
                    event.preventDefault();
                    self.animateForward();
                });
            }

            if (self.options.btnBackward) {
                $(self.options.btnBackward).on('click', function (event) {
                    event.preventDefault();
                    self.animateBackward();
                });
            }
        };


        this.animateForward = function (steps) {
            self.direction = self.FORWARD;
            animate(steps);
        };

        this.animateBackward = function (steps) {
            self.direction = self.BACKWARD;
            animate(steps);
        };

        init();
    };

    $.fn.carddeck = function (options) {
        return this.each(function () {
            if (!$.data(this, 'carddeck')) {
                $.data(this, 'carddeck', new CardDeck(this, options));
            }
        });
    };
}(jQuery, window, document));
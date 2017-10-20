#!/usr/bin/env bash

files="
kalendar_ui.py
requirements.txt
"

this_dir=`dirname $0`
deploy_dir=$this_dir/deploy

(
    cd $deploy_dir
    rm -rf *
)

cp -r public $deploy_dir/


for x in $files
do
    f=$this_dir/$x
    if [ -d $f ]; then
        cp -r $f $deploy_dir/
    else
        cp $f $deploy_dir/
    fi
done

release="kal-`date +%FT%H%M%S`"
rsync -azi --exclude '*.git' $deploy_dir/* emeryr@sims-dev.library.upenn.edu:kalendarium/$release

ssh -l emeryr sims-dev.library.upenn.edu "rm -vf kalendarium/app"
ssh -l emeryr sims-dev.library.upenn.edu "ln -s ~/kalendarium/$release kalendarium/app"
ssh -l emeryr sims-dev.library.upenn.edu "~/restart_kal.sh"
